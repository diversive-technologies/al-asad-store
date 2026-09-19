import { CATALOGUE_REVALIDATE_SECONDS } from '@/config/constants';
import { ROUTES } from '@/config/routes';
import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import { ok, type Result } from '@/lib/result';
import type { SitemapPage } from '@/lib/utils/sitemap';

import { sitemapProductsSchema } from '../schemas/sitemap.schema';

/**
 * DATA-04 — §30.5's product list for the sitemap: every product the backend says
 * is LAUNCHED, as the page each one lives at. The slugs come from the backend and
 * only from it; which products are launched is its rule, not this function's
 * (DATA-13), so nothing here filters.
 *
 * DATA-09: cached like the rest of the catalogue projection, and tagged with it,
 * so a launch or a withdrawal reaches the sitemap when a catalogue edit
 * invalidates the catalogue — not a moment later than the listing shows it.
 */
export function fetchProductSitemapPages(): Promise<Result<readonly SitemapPage[], ApiError>> {
  return apiRequest({
    path: ENDPOINTS.catalogue.sitemap,
    schema: sitemapProductsSchema,
    next: { revalidate: CATALOGUE_REVALIDATE_SECONDS, tags: ['catalogue'] },
  }).then((result) => {
    if (!result.ok) return result;
    return ok(
      result.value.products.map((product) => ({
        path: ROUTES.catalogue.detail(product.slug),
        lastModified: product.lastModifiedAt,
      })),
    );
  });
}
