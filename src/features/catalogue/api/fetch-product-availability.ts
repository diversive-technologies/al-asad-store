import type { ProductId } from '@/lib/domain/ids';
import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import type { Result } from '@/lib/result';

import {
  productDetailAvailabilitySchema,
  type ProductDetailAvailability,
} from '../schemas/piece-availability.schema';

/**
 * DATA-04 — the live per-size overlay of architecture 8.2, for one product.
 *
 * DATA-09 — caching intent: `revalidate: 0`, and this is the whole reason the
 * overlay is a separate request from the product. Product copy, media and
 * pricing cache for hours; stock cannot be cached for a second without risking
 * a customer choosing a size that sold out while the page was being served.
 *
 * A failed overlay must never take the page down. §28.2 requires sold-out sizes
 * to be shown as sold out — but a page that cannot say which sizes are gone is
 * still a page worth rendering, so the caller degrades rather than throws
 * (section 30.2), and the interface reports availability as unknown instead of
 * guessing it is fine (DATA-13a).
 */
export function fetchProductAvailability(
  productId: ProductId,
): Promise<Result<ProductDetailAvailability, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.catalogue.productAvailability,
    schema: productDetailAvailabilitySchema,
    searchParams: { productId },
    next: { revalidate: 0 },
  });
}
