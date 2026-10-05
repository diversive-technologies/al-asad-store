import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ENDPOINTS } from '@/lib/api/endpoints';

import { eventPath, recordEvents, stampEvents } from './record-events';

const EVENTS = `*${ENDPOINTS.analytics.events}`;
const VISITOR = '00000000-0000-4000-8000-0000000000aa';
const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => {
  server.close();
});

describe('eventPath', () => {
  it('drops the query string and the fragment', () => {
    expect(eventPath('/search?term=boski&page=2#top')).toBe('/search');
  });

  it('keeps at most 200 characters', () => {
    expect(eventPath(`/${'a'.repeat(400)}`)).toHaveLength(200);
  });
});

describe('stampEvents', () => {
  it('adds who and when, and cleans the path', () => {
    const [event] = stampEvents(
      [{ type: 'search', path: '/search?term=x', term: 'x', resultCount: 3 }],
      { visitorId: VISITOR, device: 'mobile' },
      new Date('2026-10-03T10:00:00Z'),
    );
    expect(event).toEqual({
      type: 'search',
      path: '/search',
      term: 'x',
      resultCount: 3,
      at: '2026-10-03T10:00:00.000Z',
      visitorId: VISITOR,
      device: 'mobile',
    });
  });
});

describe('recordEvents', () => {
  const batch = stampEvents([{ type: 'page_view', path: '/' }], {
    visitorId: VISITOR,
    device: 'desktop',
  });

  it('posts the batch with the caller headers', async () => {
    let seen: { body: unknown; address: string | null } | null = null;
    server.use(
      http.post(EVENTS, async ({ request }) => {
        seen = { body: await request.json(), address: request.headers.get('x-client-ip') };
        return new HttpResponse(null, { status: 202 });
      }),
    );

    await recordEvents(batch, { 'x-client-ip': '203.0.113.9' });

    expect(seen).toEqual({ body: { events: batch }, address: '203.0.113.9' });
  });

  it('sends nothing for an empty batch', async () => {
    server.use(http.post(EVENTS, () => HttpResponse.error()));
    await expect(recordEvents([])).resolves.toBeUndefined();
  });

  it('swallows a refusal with one log line', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    server.use(http.post(EVENTS, () => new HttpResponse(null, { status: 400 })));

    await expect(recordEvents(batch)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('gives up on an endpoint that never answers, without throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    server.use(http.post(EVENTS, () => new Promise<never>(() => undefined)));

    const started = Date.now();
    await expect(recordEvents(batch, {}, { timeoutMs: 100 })).resolves.toBeUndefined();

    expect(Date.now() - started).toBeLessThan(2000);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('swallows a network failure', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    server.use(http.post(EVENTS, () => HttpResponse.error()));
    await expect(recordEvents(batch)).resolves.toBeUndefined();
  });
});
