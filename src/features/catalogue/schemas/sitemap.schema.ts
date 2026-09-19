import { z } from 'zod';

/**
 * SSOT-09 — the wire contract for §30.5's "automatic sitemap excluding unlaunched
 * products": every LAUNCHED product's slug and when it last changed, in one read.
 *
 * A feed of its own rather than paging the search endpoint. Which products are
 * launched is §28.1's scheduled publication — a `launch_at` rule the backend owns
 * (DATA-13), so the storefront asks for the answer instead of filtering a list.
 * Search is also the dependency §30.2 expects to fail; a sitemap built from it
 * would lose every product whenever the index degraded. And the catalogue is
 * small enough (§28.6 plans for under a thousand items) that one unpaged read is
 * far inside a sitemap's 50,000-address limit.
 */
export const sitemapProductSchema = z.object({
  slug: z.string().min(1),
  /** DATA-12: ISO-8601; an offset is accepted, since Java may write one. */
  lastModifiedAt: z.iso.datetime({ offset: true }),
});

export type SitemapProduct = z.infer<typeof sitemapProductSchema>;

export const sitemapProductsSchema = z.object({
  products: z.array(sitemapProductSchema),
});
