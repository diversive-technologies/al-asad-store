import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/config/routes';

import { EMPTY_BAG } from '../lib/empty-bag';
import { fetchBag } from './bag-browser';

/**
 * The header's read of the bag, against its BFF mocked at the HTTP layer
 * (TEST-04), so the real reader and its schema check run.
 *
 * What it pins is the answer a browser with no bag gets: `204` is the empty bag,
 * read without a body to parse (PERF-10) — while a bag that IS there is still
 * held to its schema, and a malformed or failed answer never passes as one.
 */

const ORIGIN = 'http://store.test';
const BAG = `${ORIGIN}${ROUTES.api.bag}`;

const ONE_CODE_BAG = {
  ...EMPTY_BAG,
  pricing: { ...EMPTY_BAG.pricing, appliedCode: { code: 'EID10', description: '10% off for Eid' } },
};

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

describe('the bag, read from the browser', () => {
  it('reads "no bag" as the empty bag, with nothing to parse', async () => {
    server.use(http.get(BAG, () => new HttpResponse(null, { status: 204 })));

    await expect(fetchBag()).resolves.toEqual({ ok: true, value: EMPTY_BAG });
  });

  it('holds a bag that is there to its schema', async () => {
    server.use(http.get(BAG, () => HttpResponse.json(ONE_CODE_BAG)));

    const result = await fetchBag();

    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.value.pricing.appliedCode).toEqual(ONE_CODE_BAG.pricing.appliedCode);
  });

  it('never passes a malformed answer as a bag', async () => {
    server.use(http.get(BAG, () => HttpResponse.json({ lines: 'none' })));

    await expect(fetchBag()).resolves.toEqual({ ok: false, error: { kind: 'UNAVAILABLE' } });
  });

  it('reports a failed read as unavailable, never as an empty bag', async () => {
    server.use(http.get(BAG, () => new HttpResponse(null, { status: 502 })));

    await expect(fetchBag()).resolves.toEqual({ ok: false, error: { kind: 'UNAVAILABLE' } });
  });
});
