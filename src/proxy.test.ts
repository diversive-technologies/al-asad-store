import type { NextFetchEvent } from 'next/server';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as PageView from '@/lib/analytics/page-view';

import { VISITOR_COOKIE_NAME } from '@/lib/utils/cookies';

import { proxy } from '../proxy';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/page-view', async (importOriginal) => ({
  ...(await importOriginal<typeof PageView>()),
  postPageView: post,
}));

const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const KNOWN = '00000000-0000-4000-8000-0000000000bb';

function run(path: string, headers: Record<string, string> = {}) {
  const waitUntil = vi.fn();
  const request = new NextRequest(`https://store.test${path}`, {
    headers: { 'user-agent': CHROME, accept: 'text/html', ...headers },
  });
  const response = proxy(request, { waitUntil } as unknown as NextFetchEvent);
  return { response, waitUntil };
}

beforeEach(() => {
  post.mockReset();
  post.mockResolvedValue(undefined);
});

describe('proxy: the visitor cookie (M-03)', () => {
  it('sets a random UUID, httpOnly and lax, for a visitor without one', () => {
    const { response } = run('/');
    const cookie = response.cookies.get(VISITOR_COOKIE_NAME);

    expect(cookie?.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('lax');
    expect(cookie?.maxAge).toBe(60 * 60 * 24 * 365);
  });

  it('keeps the one it was given', () => {
    const { response } = run('/', { cookie: `${VISITOR_COOKIE_NAME}=${KNOWN}` });
    expect(response.cookies.get(VISITOR_COOKIE_NAME)).toBeUndefined();
  });

  it('replaces a value that is not a UUID', () => {
    const { response } = run('/', { cookie: `${VISITOR_COOKIE_NAME}=nonsense` });
    expect(response.cookies.get(VISITOR_COOKIE_NAME)?.value).not.toBe('nonsense');
  });
});

describe('proxy: the page view (M-03)', () => {
  it('reports one page_view after the response, with the visitor from the cookie', () => {
    const { waitUntil } = run('/catalogue', { cookie: `${VISITOR_COOKIE_NAME}=${KNOWN}` });

    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0]?.[0]).toMatchObject({
      type: 'page_view',
      path: '/catalogue',
      visitorId: KNOWN,
      device: 'desktop',
    });
  });

  it('records nothing for a crawler or a prefetch', () => {
    expect(run('/', { 'user-agent': 'Googlebot/2.1' }).waitUntil).not.toHaveBeenCalled();
    expect(
      run('/bag', { accept: '*/*', rsc: '1', 'next-router-prefetch': '1' }).waitUntil,
    ).not.toHaveBeenCalled();
  });

  it('does not wait on the post: a handler that never answers still returns at once', () => {
    post.mockReturnValue(new Promise<never>(() => undefined));
    const { response, waitUntil } = run('/');

    expect(response.status).toBe(200);
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });
});
