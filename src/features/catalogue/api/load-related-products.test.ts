import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ENDPOINTS } from '@/lib/api/endpoints';
import { productIdSchema } from '@/lib/domain/ids';
import { resetCarts } from '@/lib/mocks/bag-db';
import { resetReservations } from '@/lib/mocks/bag-reservations';
import { CATALOGUE, toProductCard } from '@/lib/mocks/catalogue-db';
import { handlers } from '@/lib/mocks/handlers';

import { RELATED_PRODUCTS_LIMIT } from '../schemas/related-products.schema';
import { loadRelatedProducts } from './load-related-products';

/**
 * §28.2 "You may also like", end to end below the section: the real reader, the
 * real client and its schema, and the mock backend at the HTTP layer (TEST-04).
 *
 * TEST-05 — both branches. What matters on the failure side is that it costs the
 * SECTION and never the page, and that it is logged exactly once (ERR-10).
 */

const server = setupServer(...handlers);

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

beforeEach(() => {
  resetCarts();
  resetReservations();
});

/** The first product in the catalogue — a waistcoat suit, which has plenty related to it. */
const PRODUCT = productIdSchema.parse(CATALOGUE[0]?.id);

/** Every line written to the error log, silenced so the test output stays readable. */
function captureErrorLog() {
  return vi.spyOn(console, 'error').mockImplementation(() => undefined);
}

function answerRelatedWith(response: () => Response): void {
  server.use(http.get(`*${ENDPOINTS.catalogue.related}`, response));
}

describe('loadRelatedProducts', () => {
  it('answers the related cards, each joined to its live availability', async () => {
    const log = captureErrorLog();

    const entries = await loadRelatedProducts(PRODUCT, 'en');

    expect(entries).toHaveLength(RELATED_PRODUCTS_LIMIT);
    expect(entries.map((entry) => entry.product.id)).not.toContain(PRODUCT);
    expect(entries.every((entry) => entry.availability?.productId === entry.product.id)).toBe(true);
    expect(log).not.toHaveBeenCalled();
  });

  it('answers nothing, and logs nothing, when nothing is related', async () => {
    const log = captureErrorLog();
    answerRelatedWith(() => HttpResponse.json([]));

    expect(await loadRelatedProducts(PRODUCT, 'en')).toEqual([]);
    expect(log).not.toHaveBeenCalled();
  });

  it('answers nothing when the read fails, and logs it once', async () => {
    const log = captureErrorLog();
    answerRelatedWith(() => new HttpResponse(null, { status: 500 }));

    expect(await loadRelatedProducts(PRODUCT, 'en')).toEqual([]);
    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0]?.[0]).toMatch(/^\[product:related\] SERVER/);
  });

  it('answers nothing when the backend sends more than the grid asked for', async () => {
    const log = captureErrorLog();
    const tooMany = CATALOGUE.slice(0, RELATED_PRODUCTS_LIMIT + 1).map((record) =>
      toProductCard(record, 'en'),
    );
    answerRelatedWith(() => HttpResponse.json(tooMany));

    expect(await loadRelatedProducts(PRODUCT, 'en')).toEqual([]);
    expect(log.mock.calls[0]?.[0]).toMatch(/^\[product:related\] CONTRACT_VIOLATION/);
  });

  it('keeps the cards when only the availability read fails, as unknown rather than guessed', async () => {
    const log = captureErrorLog();
    server.use(
      http.get(
        `*${ENDPOINTS.catalogue.availability}`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const entries = await loadRelatedProducts(PRODUCT, 'en');

    expect(entries).toHaveLength(RELATED_PRODUCTS_LIMIT);
    expect(entries.every((entry) => entry.availability === null)).toBe(true);
    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0]?.[0]).toMatch(/^\[product:related:availability\] SERVER/);
  });
});
