import { CATALOGUE_REVALIDATE_SECONDS } from '@/config/constants';
import type { Locale } from '@/i18n/locales';
import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import type { ProductId } from '@/lib/domain/ids';
import type { Result } from '@/lib/result';

import {
  RELATED_PRODUCTS_LIMIT,
  relatedProductsSchema,
  type RelatedProducts,
} from '../schemas/related-products.schema';

/**
 * DATA-04 — §28.2 "You may also like", keyed by the product.
 *
 * It sends the product and how many the grid can hold, and nothing else: which
 * products are related, and in what order, is the backend's rule (DATA-13).
 *
 * DATA-09 — cached like the other card read that carries no stock
 * (`fetchProductsByIds`; a search is not, since its counts are stock), because
 * the payload carries none: the live overlay
 * is a separate, uncached read merged at render (architecture 8.2, 8.4). The
 * backend's ORDER may weigh stock — it puts sold-out products last — so a
 * product that sells out can hold its place for up to one revalidation window;
 * its card still says "Sold out" at once, because that comes from the overlay.
 */
export function fetchRelatedProducts(
  productId: ProductId,
  locale: Locale,
): Promise<Result<RelatedProducts, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.catalogue.related,
    schema: relatedProductsSchema,
    searchParams: { productId, limit: RELATED_PRODUCTS_LIMIT, locale },
    next: { revalidate: CATALOGUE_REVALIDATE_SECONDS, tags: ['catalogue', `catalogue:${locale}`] },
  });
}
