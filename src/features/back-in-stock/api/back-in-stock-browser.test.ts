import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/config/routes';

import { backInStockRequestSchema } from '../schemas/back-in-stock.schema';
import { postBackInStock } from './back-in-stock-browser';

/**
 * F-09 — what a Notify Me press means to the page, below the component: our own
 * BFF is answered at the HTTP layer (TEST-04) so the real reader runs. A 429 is
 * Java's per-address limit, and it must read as "wait", not as a store that is
 * down.
 */

const ORIGIN = 'http://store.test';
const URL_ = `${ORIGIN}${ROUTES.api.backInStock}`;

const REQUEST = backInStockRequestSchema.parse({
  productId: '00000000-0000-4000-8000-00000000b001',
  pieceId: null,
  sizeId: '00000000-0000-4000-8000-00000000b003',
  email: 'someone@example.com',
});

const server = setupServer();

beforeAll(() => {
  vi.stubGlobal('window', { location: { origin: ORIGIN } });
  vi.stubGlobal('location', { href: `${ORIGIN}/catalogue` });
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

describe('postBackInStock', () => {
  it.each([
    [400, 'INVALID'],
    [404, 'NOT_OFFERED'],
    [429, 'RATE_LIMITED'],
    [502, 'UNREACHABLE'],
  ])('reads a %i from the BFF as %s', async (status, kind) => {
    server.use(http.post(URL_, () => new HttpResponse(null, { status })));

    await expect(postBackInStock(REQUEST)).resolves.toEqual({ ok: false, error: { kind } });
  });

  it('reads an answer as a value', async () => {
    server.use(http.post(URL_, () => HttpResponse.json({ kind: 'RECORDED' })));

    await expect(postBackInStock(REQUEST)).resolves.toEqual({
      ok: true,
      value: { kind: 'RECORDED' },
    });
  });
});
