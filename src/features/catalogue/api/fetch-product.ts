import { CATALOGUE_REVALIDATE_SECONDS } from '@/config/constants';
import type { Locale } from '@/i18n/locales';
import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import { ok, type Result } from '@/lib/result';

import { productDetailSchema, type ProductDetail } from '../schemas/product-detail.schema';

/**
 * DATA-04 — section 12 `CatalogueQuery.getProduct`, keyed by slug.
 *
 * A slug that matches nothing is an ORDINARY outcome, not a failure: people
 * follow stale links and edit addresses. The backend says so with a 404, which
 * `apiRequest` normalises to NOT_FOUND, and this translates that one kind back
 * into `ok(null)` so the route can render `notFound()` rather than an error
 * page. Every other failure stays a failure — a timeout is not "no such
 * product", and collapsing the two would tell a customer the item is gone when
 * the store is merely unreachable (ERR-03).
 *
 * DATA-09 — caching intent: product data is the cacheable half of architecture
 * 8.2 and is tagged so a catalogue edit can invalidate it. Stock is deliberately
 * absent from this payload and is read live elsewhere.
 */
export function fetchProduct(
  slug: string,
  locale: Locale,
): Promise<Result<ProductDetail | null, ApiError>> {
  const trimmed = slug.trim();
  if (trimmed.length === 0) return Promise.resolve(ok(null));

  return apiRequest({
    path: ENDPOINTS.catalogue.product,
    schema: productDetailSchema,
    searchParams: { slug: trimmed, locale },
    next: { revalidate: CATALOGUE_REVALIDATE_SECONDS, tags: ['catalogue', `catalogue:${locale}`] },
  }).then((result) => {
    if (result.ok) return ok(result.value);
    if (result.error.kind === 'NOT_FOUND') return ok(null);
    return result;
  });
}
