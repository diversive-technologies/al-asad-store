import { beforeEach, describe, expect, it, vi } from 'vitest';

const SECRET = vi.hoisted(() => 'a-revalidate-secret-of-at-least-32-chars');

const revalidated = vi.hoisted(() => [] as unknown[][]);
vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => {
    revalidated.push(args);
  },
}));
vi.mock('@/config/env.server', () => ({ serverEnv: { REVALIDATE_SECRET: SECRET } }));

import { POST } from '../../../app/api/revalidate/route';

import { REVALIDATE_TAGS, secretMatches } from './revalidate-request';

/**
 * F-06 - `POST /api/revalidate`: the shared secret decides, before the body is
 * read; a good call revalidates each named tag and answers 204.
 */

let nextAddress = 0;
function call(
  body: unknown,
  { secret = SECRET, address }: { secret?: string | null; address?: string } = {},
): Request {
  nextAddress += 1;
  return new Request('https://store.test/api/revalidate', {
    method: 'POST',
    headers: {
      'x-forwarded-for': address ?? `203.0.113.${String(nextAddress)}`,
      ...(secret === null ? {} : { 'x-revalidate-secret': secret }),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  revalidated.length = 0;
});

describe('POST /api/revalidate', () => {
  it('answers 204 and revalidates every named tag immediately', async () => {
    const response = await POST(call({ tags: ['catalogue', 'content:homepage'] }));

    expect(response.status).toBe(204);
    expect(revalidated).toEqual([
      ['catalogue', { expire: 0 }],
      ['content:homepage', { expire: 0 }],
    ]);
  });

  it('accepts all five tags and revalidates a repeated tag once', async () => {
    expect((await POST(call({ tags: [...REVALIDATE_TAGS] }))).status).toBe(204);
    expect(revalidated).toHaveLength(5);

    revalidated.length = 0;
    await POST(call({ tags: ['catalogue', 'catalogue'] }));
    expect(revalidated).toHaveLength(1);
  });

  it('answers 401, with no body, to a wrong secret and revalidates nothing', async () => {
    const response = await POST(call({ tags: ['catalogue'] }, { secret: 'wrong' }));

    expect(response.status).toBe(401);
    expect(await response.text()).toBe('');
    expect(revalidated).toHaveLength(0);
  });

  it('answers 401 to a missing secret and to a prefix of the real one', async () => {
    expect((await POST(call({ tags: ['catalogue'] }, { secret: null }))).status).toBe(401);
    expect(
      (await POST(call({ tags: ['catalogue'] }, { secret: SECRET.slice(0, -1) }))).status,
    ).toBe(401);
    expect(revalidated).toHaveLength(0);
  });

  it('checks the secret before the body: a bad body with a wrong secret is 401', async () => {
    expect((await POST(call('not json', { secret: 'wrong' }))).status).toBe(401);
  });

  it.each([
    ['an unknown tag', { tags: ['catalogue', 'orders'] }],
    ['no tags', { tags: [] }],
    ['tags that are not a list', { tags: 'catalogue' }],
    ['a body with no tags', {}],
    ['a body that is not JSON', 'nope'],
  ])('answers 400 to %s and revalidates nothing', async (_name, body) => {
    const response = await POST(call(body));

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('');
    expect(revalidated).toHaveLength(0);
  });

  it('refuses a body declared over 1 kB with 413', async () => {
    const response = await POST(
      new Request('https://store.test/api/revalidate', {
        method: 'POST',
        headers: { 'x-revalidate-secret': SECRET, 'content-length': '5000' },
        body: JSON.stringify({ tags: ['catalogue'] }),
      }),
    );

    expect(response.status).toBe(413);
  });

  it('slows an address that keeps sending wrong secrets, and spares other addresses', async () => {
    const address = '198.51.100.77';
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await POST(call({ tags: ['catalogue'] }, { secret: 'bad', address }))).status).toBe(
        401,
      );
    }

    const limited = await POST(call({ tags: ['catalogue'] }, { secret: 'bad', address }));
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('60');

    expect((await POST(call({ tags: ['catalogue'] }))).status).toBe(204);
  });

  it('is never cached', async () => {
    expect((await POST(call({ tags: ['catalogue'] }))).headers.get('cache-control')).toBe(
      'no-store',
    );
  });
});

describe('secretMatches', () => {
  it('is false for an unset secret, a missing header and a different value', () => {
    expect(secretMatches(undefined, SECRET)).toBe(false);
    expect(secretMatches(SECRET, null)).toBe(false);
    expect(secretMatches(SECRET, `${SECRET}x`)).toBe(false);
    expect(secretMatches(SECRET, '')).toBe(false);
  });

  it('is true only for the same value', () => {
    expect(secretMatches(SECRET, SECRET)).toBe(true);
  });
});
