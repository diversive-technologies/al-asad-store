import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ENDPOINTS } from '@/lib/api/endpoints';

import { EMPTY_QUERY } from '../lib/search-params';
import { DEFAULT_PAGE_SIZE, type ResultPage } from '../schemas/search.schema';
import { searchProducts } from './search-products';

/**
 * §15's search through the real client and its contract, with the backend mocked
 * at the HTTP layer (TEST-04).
 *
 * What it pins is the caching intent (DATA-09). Every answer carries
 * `facets.inStockCount`, and under "In stock only" the products and every count
 * are read against the live overlay too — so the read must reach the backend
 * each time rather than being served from Next's data cache for five minutes
 * (§8.4: "nothing that affects money or stock is served from cache"). The intent
 * is what the read hands to `fetch`, which is where Next's cache reads it.
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

/**
 * The smallest answer the contract admits: nothing matched, and the facets say
 * so — including the stock count every answer carries.
 */
const NOTHING_MATCHED: ResultPage = {
  products: [],
  totalCount: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  totalPages: 0,
  facets: {
    fabric: [],
    colour: [],
    garmentType: [],
    pieceCount: [],
    priceBounds: { minMinor: 0, maxMinor: 0 },
    inStockCount: 0,
  },
  collection: null,
};

function answerSearchWith(response: () => Response): void {
  server.use(http.get(`*${ENDPOINTS.catalogue.search}`, response));
}

describe('searchProducts', () => {
  it.each([
    ['the whole catalogue', EMPTY_QUERY],
    ['"In stock only"', { ...EMPTY_QUERY, inStockOnly: true }],
  ])('reads %s live, because every answer carries a stock count', async (_label, query) => {
    answerSearchWith(() => HttpResponse.json(NOTHING_MATCHED));
    const sent = vi.spyOn(globalThis, 'fetch');

    const result = await searchProducts(query, 'en');

    expect(result).toMatchObject({
      ok: true,
      value: { facets: { inStockCount: expect.any(Number) } },
    });
    expect(sent.mock.calls[0]?.[1]?.next).toEqual({ revalidate: 0 });
  });

  it('reports an unreachable backend as an error, never as an empty catalogue', async () => {
    answerSearchWith(() => HttpResponse.error());

    const result = await searchProducts(EMPTY_QUERY, 'en');

    expect(result).toMatchObject({ ok: false, error: { kind: 'NETWORK' } });
  });
});
