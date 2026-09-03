import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import type { ProductId } from '@/lib/domain/ids';
import { ok, type Result } from '@/lib/result';

import { availabilityListSchema, type ProductAvailability } from '../schemas/availability.schema';

/**
 * DATA-04 — a thin, typed wrapper over the client.
 *
 * The availability overlay of architecture 8.2. It is a small, cheap, live read
 * kept deliberately separate from the cached product projection: stock changes
 * on every order, and folding it into the projection would invalidate the
 * browse cache constantly.
 */
export function fetchAvailability(
  productIds: readonly ProductId[],
): Promise<Result<ProductAvailability[], ApiError>> {
  // Nothing to ask about — skip the round trip rather than sending an empty query.
  if (productIds.length === 0) return Promise.resolve(ok([]));

  return apiRequest({
    path: ENDPOINTS.catalogue.availability,
    schema: availabilityListSchema,
    searchParams: { productIds: productIds.join(',') },
    // DATA-09 / architecture 8.4: nothing affecting money or stock is cached.
    next: { revalidate: 0 },
  });
}
