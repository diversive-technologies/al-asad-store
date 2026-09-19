import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { fetchWithContract } from './browser-fetch';

/**
 * PERF-10 — a browser call to our own BFF, with the schema module that will
 * judge its answer fetched with it: beside a read, ahead of a write. Against
 * the BFF mocked at the HTTP layer (TEST-04), so the real `fetch` runs.
 *
 * What it pins is ERR-05(1): neither half ever rejects. A request that could
 * not be sent and a module that could not be downloaded are both `null`, for
 * the caller to turn into the failure its own union names.
 */

const ORIGIN = 'http://store.test';
const ROUTE = `${ORIGIN}/api/example`;
const CONTRACT = { name: 'the schemas' } as const;

const server = setupServer();

beforeAll(() => {
  // The interceptor resolves a relative address against `location`, as a browser does.
  vi.stubGlobal('location', { href: `${ORIGIN}/catalogue` });
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});

describe('a BFF call with its contract fetched with it', () => {
  it('hands back the response and the contract together', async () => {
    server.use(http.post(ROUTE, () => HttpResponse.json({ kind: 'OK' })));

    const [response, contract] = await fetchWithContract('/api/example', { method: 'POST' }, () =>
      Promise.resolve(CONTRACT),
    );

    expect(response?.status).toBe(200);
    await expect(response?.json()).resolves.toEqual({ kind: 'OK' });
    expect(contract).toBe(CONTRACT);
  });

  it('answers null for a request that could not be sent, never a rejection', async () => {
    server.use(http.get(ROUTE, () => HttpResponse.error()));

    await expect(
      fetchWithContract('/api/example', {}, () => Promise.resolve(CONTRACT)),
    ).resolves.toEqual([null, CONTRACT]);
  });

  it('answers null for a READ whose contract could not be downloaded, keeping the response', async () => {
    server.use(http.get(ROUTE, () => new HttpResponse(null, { status: 204 })));

    const [response, contract] = await fetchWithContract('/api/example', {}, () =>
      Promise.reject(new Error('chunk failed to load')),
    );

    expect(response?.status).toBe(204);
    expect(contract).toBeNull();
  });

  /*
   * TEST-08 — a write used to be sent beside its contract, so one the server
   * APPLIED came back unreadable whenever the contract's download failed: the
   * bag reported "we could not add that", the customer pressed again, and the
   * bag held two.
   */
  it.each(['POST', 'PATCH'])(
    'never sends a %s whose answer could not be read, so trying again cannot apply it twice',
    async (method) => {
      let received = 0;
      server.use(
        http.all(ROUTE, () => {
          received += 1;
          return HttpResponse.json({ kind: 'OK' });
        }),
      );

      const answer = await fetchWithContract('/api/example', { method }, () =>
        Promise.reject(new Error('chunk failed to load')),
      );

      expect(answer).toEqual([null, null]);
      expect(received).toBe(0);
    },
  );

  it('sends a write once its contract has arrived, and hands both back', async () => {
    let received = 0;
    server.use(
      http.post(ROUTE, () => {
        received += 1;
        return HttpResponse.json({ kind: 'OK' });
      }),
    );

    const [response, contract] = await fetchWithContract('/api/example', { method: 'post' }, () =>
      Promise.resolve(CONTRACT),
    );

    expect(received).toBe(1);
    expect(response?.status).toBe(200);
    expect(contract).toBe(CONTRACT);
  });
});
