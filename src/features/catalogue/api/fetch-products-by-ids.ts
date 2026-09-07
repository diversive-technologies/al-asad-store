import { z } from 'zod';

import { CATALOGUE_REVALIDATE_SECONDS } from '@/config/constants';
import type { Locale } from '@/i18n/locales';
import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import { ok, type Result } from '@/lib/result';

import { productCardSchema, type ProductCard } from '../schemas/product-card.schema';

const productCardListSchema = z.array(productCardSchema);

/**
 * DATA-04 — a thin, typed wrapper over the client.
 *
 * Several product projections in one read. The saved-items list holds ids and
 * nothing else, so rendering it means asking for those products by id — and one
 * request rather than one per id, because a list of twenty would otherwise be
 * twenty round trips (PERF-02).
 *
 * The response may be SHORTER than the request. A product withdrawn since it
 * was saved is an expected outcome of this read rather than a failure of it, so
 * the missing one is absent rather than a 404 — and the caller can see the
 * shortfall by comparing lengths. That is deliberately not treated as an error
 * here: deciding what to tell the customer about it is the screen's job.
 *
 * DATA-09: cached like the rest of the catalogue projection, and for the same
 * reason — this carries no stock. Availability is the separate live read that
 * decorates it (architecture 8.2).
 */
export function fetchProductsByIds(
  productIds: readonly string[],
  locale: Locale,
): Promise<Result<ProductCard[], ApiError>> {
  // Nothing to ask about — skip the round trip rather than sending an empty query.
  if (productIds.length === 0) return Promise.resolve(ok([]));

  return apiRequest({
    path: ENDPOINTS.catalogue.byIds,
    schema: productCardListSchema,
    searchParams: { productIds: productIds.join(','), locale },
    next: { revalidate: CATALOGUE_REVALIDATE_SECONDS, tags: ['catalogue', `catalogue:${locale}`] },
  });
}
