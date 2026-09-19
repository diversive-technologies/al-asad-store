import type { Locale } from '@/i18n/locales';
import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import type { Result } from '@/lib/result';

import { toSearchParams } from '../lib/search-params';
import { resultPageSchema, type CatalogueQuery, type ResultPage } from '../schemas/search.schema';

/**
 * DATA-04 — a thin, typed wrapper over the client.
 *
 * The request is built from the SAME canonical serialisation the address bar
 * uses, so a shared URL and the backend call it produces cannot disagree.
 *
 * The locale travels as a query parameter, as on every localised read here: it
 * is the form that stays correct if a cache is ever put in front of this read,
 * because Next's data cache keys on the URL and not on headers.
 */
export function searchProducts(
  query: CatalogueQuery,
  locale: Locale,
): Promise<Result<ResultPage, ApiError>> {
  const params = toSearchParams(query);
  params.set('locale', locale);

  return apiRequest({
    path: ENDPOINTS.catalogue.search,
    schema: resultPageSchema,
    searchParams: Object.fromEntries(params.entries()),
    /*
     * DATA-09 — NOT cached, because every page of results carries stock. §15
     * counts "In stock only" against the live overlay, so `facets.inStockCount`
     * is a stock figure on every answer, and under "In stock only" the products,
     * the total and every other count are too. Architecture §8.4: "nothing that
     * affects money or stock is served from cache". Cached, the listing kept a
     * product that had just sold out under "In stock only" beside its own live
     * "Sold out" badge, and kept one that had come back out, for five minutes.
     * The product projections themselves cache where they are read alone
     * (`fetchProduct`, `fetchProductsByIds`).
     */
    next: { revalidate: 0 },
  });
}
