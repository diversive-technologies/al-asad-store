import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { GET } from '../../../app/api/health/route';
import { HEALTH_TIMEOUT_MS } from './health';

/**
 * F-08 — `GET /api/health` is what an uptime monitor reads. UP only for Java's own
 * `200 {"status":"UP"}`; every other thing Java can do is DOWN, as a 503, and it is
 * never cached.
 */

const HEALTH = '*/api/v1/health';

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

async function ask(): Promise<{ status: number; body: unknown; cache: string | null }> {
  const response = await GET();
  return {
    status: response.status,
    body: await response.json(),
    cache: response.headers.get('Cache-Control'),
  };
}

describe('GET /api/health', () => {
  it('answers 200 UP while Java answers UP', async () => {
    server.use(http.get(HEALTH, () => HttpResponse.json({ status: 'UP' })));

    await expect(ask()).resolves.toEqual({
      status: 200,
      body: { status: 'UP' },
      cache: 'no-store',
    });
  });

  it('answers 503 DOWN when Java answers its own 503 DOWN', async () => {
    server.use(http.get(HEALTH, () => HttpResponse.json({ status: 'DOWN' }, { status: 503 })));

    await expect(ask()).resolves.toEqual({
      status: 503,
      body: { status: 'DOWN' },
      cache: 'no-store',
    });
  });

  it.each([
    ['Access refusing the token', () => new HttpResponse(null, { status: 403 })],
    ['Java failing', () => new HttpResponse(null, { status: 500 })],
    ['Java unreachable', () => HttpResponse.error()],
    ['a 200 that is not the contract', () => HttpResponse.json({ status: 'DOWN' })],
    ['a 200 with no body', () => new HttpResponse(null, { status: 200 })],
  ])('answers 503 DOWN for %s', async (_label, respond) => {
    server.use(http.get(HEALTH, respond));

    await expect(ask()).resolves.toEqual({
      status: 503,
      body: { status: 'DOWN' },
      cache: 'no-store',
    });
  });

  it('gives up after three seconds rather than hanging the monitor', async () => {
    expect(HEALTH_TIMEOUT_MS).toBe(3000);
    server.use(
      http.get(HEALTH, async () => {
        await delay(HEALTH_TIMEOUT_MS + 2000);
        return HttpResponse.json({ status: 'UP' });
      }),
    );

    const started = Date.now();
    const answer = await ask();

    expect(answer.status).toBe(503);
    expect(Date.now() - started).toBeLessThan(HEALTH_TIMEOUT_MS + 1500);
  }, 10_000);

  it('logs nothing for a failed check, so a monitor cannot flood the tracker', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    server.use(http.get(HEALTH, () => HttpResponse.error()));

    await ask();

    expect(spy).not.toHaveBeenCalled();
  });
});
