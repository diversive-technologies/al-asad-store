import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '../../../app/api/client-error/route';

/**
 * F-08 — `POST /api/client-error`: public, so it is bounded and it ANSWERS 204 to
 * everything that passes the origin check, while forwarding only what is believed.
 */

const captured = vi.hoisted(() => [] as unknown[]);
vi.mock('./error-tracking', () => ({
  captureClientError: (report: unknown) => {
    captured.push(report);
  },
}));

const URL_ = 'https://store.test/api/client-error';

let nextAddress = 0;
/** A fresh client address per test, so one test's reports do not spend another's limit. */
function freshAddress(): string {
  nextAddress += 1;
  return `198.51.100.${String(nextAddress)}`;
}

function report(
  body: string,
  { address = freshAddress(), origin }: { address?: string; origin?: string } = {},
): Request {
  return new Request(URL_, {
    method: 'POST',
    headers: {
      'x-forwarded-for': address,
      ...(origin === undefined ? {} : { origin }),
    },
    body,
  });
}

const VALID = JSON.stringify({ message: 'boom', digest: 'abc', path: '/catalogue?x=1' });

beforeEach(() => {
  captured.length = 0;
});

describe('POST /api/client-error', () => {
  it('forwards a valid report, with the pathname only, and answers 204', async () => {
    const response = await POST(report(VALID));

    expect(response.status).toBe(204);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(captured).toEqual([{ message: 'boom', digest: 'abc', path: '/catalogue' }]);
  });

  it('refuses another origin first, and forwards nothing', async () => {
    const response = await POST(report(VALID, { origin: 'https://evil.example' }));

    expect(response.status).toBe(403);
    expect(captured).toEqual([]);
  });

  it('accepts its own origin', async () => {
    const response = await POST(report(VALID, { origin: 'https://store.test' }));

    expect(response.status).toBe(204);
    expect(captured).toHaveLength(1);
  });

  it.each([
    ['not JSON', 'not json'],
    ['an empty body', ''],
    ['the wrong shape', JSON.stringify({ nope: true })],
    ['too long a message', JSON.stringify({ message: 'x'.repeat(600), path: '/' })],
  ])('answers 204 and forwards nothing for %s', async (_label, body) => {
    const response = await POST(report(body));

    expect(response.status).toBe(204);
    expect(captured).toEqual([]);
  });

  it('answers 204 and forwards nothing for a body over 2 kB', async () => {
    const big = JSON.stringify({ message: 'x', path: '/', pad: 'p'.repeat(3000) });

    const response = await POST(report(big));

    expect(response.status).toBe(204);
    expect(captured).toEqual([]);
  });

  it('takes five reports a minute from one address and silently drops the sixth', async () => {
    const address = freshAddress();

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      statuses.push((await POST(report(VALID, { address }))).status);
    }

    expect(statuses).toEqual([204, 204, 204, 204, 204, 204]);
    expect(captured).toHaveLength(5);
  });

  it('counts another address on its own', async () => {
    const busy = freshAddress();
    for (let attempt = 0; attempt < 6; attempt += 1) await POST(report(VALID, { address: busy }));
    captured.length = 0;

    await POST(report(VALID, { address: freshAddress() }));

    expect(captured).toHaveLength(1);
  });
});
