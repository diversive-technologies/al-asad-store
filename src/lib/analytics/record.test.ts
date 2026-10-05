import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as RecordEvents from './record-events';

import { VISITOR_COOKIE_NAME } from '@/lib/utils/cookies';

import {
  recordPageEvents,
  recordPageEventsIf,
  recordRequestEvents,
  visitorHeaders,
} from './record';

const state = vi.hoisted(() => ({
  headers: new Headers(),
  cookie: undefined as string | undefined,
  scheduled: [] as Array<() => unknown>,
}));
const post = vi.hoisted(() => vi.fn());

vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(state.headers),
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        state.cookie === undefined ? undefined : { name, value: state.cookie },
    }),
}));
vi.mock('next/server', () => ({
  after: (callback: () => unknown) => {
    state.scheduled.push(callback);
  },
}));
vi.mock('./record-events', async (importOriginal) => ({
  ...(await importOriginal<typeof RecordEvents>()),
  recordEvents: post,
}));

const VISITOR = '00000000-0000-4000-8000-0000000000cc';
const PRODUCT = '00000000-0000-4000-8000-00000000a001';
const CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';

async function runScheduled(): Promise<void> {
  for (const callback of state.scheduled.splice(0)) await callback();
}

beforeEach(() => {
  state.headers = new Headers({ 'user-agent': CHROME, 'x-forwarded-for': '203.0.113.9' });
  state.cookie = VISITOR;
  state.scheduled = [];
  post.mockReset();
  post.mockResolvedValue(undefined);
});

describe('recordPageEvents', () => {
  it('schedules the event after the response, stamped with the visitor and device', async () => {
    await recordPageEvents({ type: 'product_view', path: '/catalogue/x', productId: PRODUCT });

    expect(post).not.toHaveBeenCalled(); // nothing is sent while the page renders
    await runScheduled();

    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({
        type: 'product_view',
        path: '/catalogue/x',
        productId: PRODUCT,
        visitorId: VISITOR,
        device: 'mobile',
      }),
    ]);
    expect(post.mock.calls[0]?.[1]).toEqual({ 'x-client-ip': '203.0.113.9' });
  });

  it('carries a search with its term and result count', async () => {
    await recordPageEvents({ type: 'search', path: '/search', term: 'boski', resultCount: 4 });
    await runScheduled();

    expect(post.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({ type: 'search', term: 'boski', resultCount: 4 }),
    ]);
  });

  it('records nothing for a crawler, a prefetch, or a visitor without an id', async () => {
    state.headers = new Headers({ 'user-agent': 'Googlebot/2.1' });
    await recordPageEvents({ type: 'page_view', path: '/' });

    state.headers = new Headers({ 'user-agent': CHROME, 'next-router-prefetch': '1' });
    await recordPageEvents({ type: 'page_view', path: '/' });

    state.headers = new Headers({ 'user-agent': CHROME });
    state.cookie = undefined;
    await recordPageEvents({ type: 'page_view', path: '/' });

    expect(state.scheduled).toHaveLength(0);
  });
});

describe('recordPageEventsIf', () => {
  it('records when the condition holds', async () => {
    await recordPageEventsIf(() => Promise.resolve(true), {
      type: 'checkout_started',
      path: '/checkout',
    });
    await runScheduled();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('records nothing when it does not hold, or when the look-up fails', async () => {
    await recordPageEventsIf(() => Promise.resolve(false), {
      type: 'checkout_started',
      path: '/checkout',
    });
    await recordPageEventsIf(() => Promise.reject(new Error('down')), {
      type: 'checkout_started',
      path: '/checkout',
    });
    await runScheduled();
    expect(post).not.toHaveBeenCalled();
  });
});

describe('recordRequestEvents', () => {
  it('records from a Route Handler request, and not for a HEAD', async () => {
    const request = new Request('https://store.test/api/try-on', {
      method: 'POST',
      headers: { 'user-agent': CHROME },
    });
    await recordRequestEvents(request, {
      type: 'try_on_started',
      path: '/api/try-on',
      productId: PRODUCT,
    });
    await runScheduled();
    expect(post.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({ type: 'try_on_started', productId: PRODUCT, visitorId: VISITOR }),
    ]);

    post.mockClear();
    await recordRequestEvents(
      new Request('https://store.test/x', { method: 'HEAD', headers: { 'user-agent': CHROME } }),
      {
        type: 'try_on_started',
        path: '/x',
      },
    );
    expect(state.scheduled).toHaveLength(0);
  });
});

describe('visitorHeaders', () => {
  it('forwards the visitor id and the device', async () => {
    expect(await visitorHeaders({ headers: state.headers })).toEqual({
      'x-visitor-id': VISITOR,
      'x-visitor-device': 'mobile',
    });
  });

  it('forwards nothing for a visitor without a valid id', async () => {
    state.cookie = 'nonsense';
    expect(await visitorHeaders({ headers: state.headers })).toEqual({});
    expect(VISITOR_COOKIE_NAME).toBe('aa_visitor');
  });
});
