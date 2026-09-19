import type { MetadataRoute } from 'next';

import { fetchProductSitemapPages } from '@/features/catalogue';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { logApiError } from '@/lib/utils/log';
import { PUBLIC_PAGE_PATHS, sitemapEntries, type SitemapPage } from '@/lib/utils/sitemap';

/**
 * §30.5's automatic sitemap, at `/sitemap.xml`: the public pages, and every
 * product the backend says is launched — the slugs come from the backend's own
 * feed, never from anything this storefront holds.
 *
 * Cached by Next as the product feed's read is (DATA-09), so it follows a
 * catalogue edit rather than being rebuilt for every crawler. §30.2: a feed that
 * cannot be read costs the sitemap its products, never the pages it always has.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // D1: a metadata route runs outside the root layout, so it arms the mock itself.
  await ensureMockServer();

  const products = await fetchProductSitemapPages();
  if (!products.ok) logApiError('sitemap', products.error); // ERR-10

  const fixed: SitemapPage[] = PUBLIC_PAGE_PATHS.map((path) => ({ path, lastModified: null }));
  return sitemapEntries([...fixed, ...(products.ok ? products.value : [])]);
}
