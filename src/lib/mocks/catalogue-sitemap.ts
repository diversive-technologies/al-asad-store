import { CATALOGUE } from './catalogue-db';

/**
 * D1 — §30.5's sitemap feed, standing in for Java: every product whose launch has
 * come, by slug, with when it last changed.
 *
 * "Excluding unlaunched products" is §28.1's scheduled publication, and it is
 * decided HERE, on the backend's side of the wire (DATA-13): the storefront lists
 * what it is given. `now` is a parameter so the rule can be tested against a
 * moment when some of the fixture had not launched yet — today every fixture
 * product has.
 *
 * The fixture never edits a product after it launches, so its launch is the last
 * time it changed. The real service answers with the product's own record.
 */

export interface SitemapProductPayload {
  readonly slug: string;
  readonly lastModifiedAt: string;
}

export function sitemapProductsAt(now: number): { products: SitemapProductPayload[] } {
  return {
    products: CATALOGUE.filter((record) => Date.parse(record.launchedAt) <= now).map((record) => ({
      slug: record.slug,
      lastModifiedAt: record.launchedAt,
    })),
  };
}
