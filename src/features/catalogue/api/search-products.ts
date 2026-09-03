import { CATALOGUE_REVALIDATE_SECONDS } from '@/config/constants';
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
 * uses, so a shared URL and the backend call it produces cannot disagree, and
 * two customers with identical filters produce one cache entry rather than two.
 *
 * The locale travels as a query parameter for the reason found the hard way on
 * the homepage: Next's data cache keys on the URL, not on headers, so a
 * header-scoped locale makes both languages collide on one entry and the store
 * serves English facet labels inside an Urdu page.
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
     * DATA-09. Catalogue content changes rarely and is cached, per architecture
     * 8.4. Stock is deliberately NOT in this payload — the availability overlay
     * is a separate, uncached read merged at render — so caching results cannot
     * show anyone a stale purchasability.
     */
    next: { revalidate: CATALOGUE_REVALIDATE_SECONDS, tags: ['catalogue', `catalogue:${locale}`] },
  });
}
