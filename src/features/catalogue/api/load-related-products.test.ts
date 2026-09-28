import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { z } from 'zod';

import { ENDPOINTS } from '@/lib/api/endpoints';

import { fixtureProductId, productCardFixture } from '../lib/test-fixtures';
import type { productAvailabilitySchema } from '../schemas/availability.schema';
import type { ProductCard } from '../schemas/product-card.schema';
import { RELATED_PRODUCTS_LIMIT } from '../schemas/related-products.schema';
import { loadRelatedProducts } from './load-related-products';

/**
 * §28.2 "You may also like", end to end below the section: the real reader, the
 * real client and its schema, and the backend mocked at the HTTP layer (TEST-04).
 * WHICH products relate is the backend's rule (DATA-13), so each case answers
 * the related cards itself and asserts only what this side does with them.
 *
 * TEST-05 — both branches. What matters on the failure side is that it costs the
 * SECTION and never the page, and that it is logged exactly once (ERR-10).
 */

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

/** The product whose page the section sits on. */
const PRODUCT = fixtureProductId(0);

/** What the backend relates to it — fewer than the grid holds, as is ordinary. */
const RELATED: readonly ProductCard[] = [
  productCardFixture(1),
  productCardFixture(2),
  productCardFixture(3),
];

/** One card more than the section asked for. */
const TOO_MANY: readonly ProductCard[] = Array.from(
  { length: RELATED_PRODUCTS_LIMIT + 1 },
  (_, i) => productCardFixture(i + 1),
);

/** Every line written to the error log, silenced so the test output stays readable. */
function captureErrorLog() {
  return vi.spyOn(console, 'error').mockImplementation(() => undefined);
}

function answerRelatedWith(response: () => Response): void {
  server.use(http.get(`*${ENDPOINTS.catalogue.related}`, response));
}

/**
 * The backend's answer to exactly the question the section must ask — PRODUCT,
 * as many as the grid holds, in English — and a 404 to any other, as for a
 * product it does not know. A reader that asked the wrong question fails here.
 */
function answerRelatedToProductWith(products: readonly ProductCard[]): void {
  server.use(
    http.get(`*${ENDPOINTS.catalogue.related}`, ({ request }) => {
      const asked = new URL(request.url).searchParams;
      const isTheQuestion =
        asked.get('productId') === PRODUCT &&
        asked.get('limit') === String(RELATED_PRODUCTS_LIMIT) &&
        asked.get('locale') === 'en';
      return isTheQuestion ? HttpResponse.json(products) : new HttpResponse(null, { status: 404 });
    }),
  );
}

/** The overlay's report on one product, as the wire carries it. */
function lowStock(productId: string): z.input<typeof productAvailabilitySchema> {
  return { productId, status: 'LOW_STOCK', unavailablePieceNames: [] };
}

/** The live overlay, reporting every product it was asked about — and only those — as low. */
function answerAvailabilityForWhatWasAsked(): void {
  server.use(
    http.get(`*${ENDPOINTS.catalogue.availability}`, ({ request }) => {
      const asked = new URL(request.url).searchParams.get('productIds')?.split(',') ?? [];
      return HttpResponse.json(asked.map(lowStock));
    }),
  );
}

describe('loadRelatedProducts', () => {
  it('answers the related cards, each joined to its live availability', async () => {
    const log = captureErrorLog();
    answerRelatedToProductWith(RELATED);
    answerAvailabilityForWhatWasAsked();

    const entries = await loadRelatedProducts(PRODUCT, 'en');

    expect(entries).toEqual(
      RELATED.map((product) => ({ product, availability: lowStock(product.id) })),
    );
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
    answerRelatedWith(() => HttpResponse.json(TOO_MANY));

    expect(await loadRelatedProducts(PRODUCT, 'en')).toEqual([]);
    expect(log.mock.calls[0]?.[0]).toMatch(/^\[product:related\] CONTRACT_VIOLATION/);
  });

  it('keeps the cards when only the availability read fails, as unknown rather than guessed', async () => {
    const log = captureErrorLog();
    answerRelatedToProductWith(RELATED);
    server.use(
      http.get(
        `*${ENDPOINTS.catalogue.availability}`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const entries = await loadRelatedProducts(PRODUCT, 'en');

    expect(entries).toEqual(RELATED.map((product) => ({ product, availability: null })));
    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0]?.[0]).toMatch(/^\[product:related:availability\] SERVER/);
  });
});
