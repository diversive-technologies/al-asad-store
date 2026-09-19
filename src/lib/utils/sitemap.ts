import { HELP_PAGE_SLUGS, ROUTES, STORE_PAGE_SLUGS } from '@/config/routes';
import { absoluteUrl } from '@/config/site';
import { DEFAULT_LOCALE } from '@/i18n/locales';

import { localeAlternates } from './locale-alternates';

/**
 * §30.5's automatic sitemap, as data. `app/sitemap.ts` composes it; this builds it.
 *
 * Each entry is a page's CANONICAL address plus the same page in every locale —
 * exactly what that page's own metadata states through `localeAlternates`, so the
 * sitemap and the pages never disagree about which address is which (§30.5: "both
 * locales published, declared and cross-linked").
 */

/** One page to list: its canonical path from `ROUTES`, and when it last changed if known. */
export interface SitemapPage {
  readonly path: string;
  /** ISO-8601 from the backend, or `null` for a page with no date worth claiming. */
  readonly lastModified: string | null;
}

/** The shape Next's `MetadataRoute.Sitemap` entries take, stated without importing Next. */
export interface SitemapEntry {
  readonly url: string;
  readonly lastModified?: string;
  readonly alternates: { readonly languages: Readonly<Record<string, string>> };
}

/**
 * The public pages that are not products, by their canonical paths: the store's
 * front door, the listing, the made-to-measure studio, and every help and store
 * page the footer links. Search results, filtered views and everything a visitor
 * reaches only by acting (bag, checkout, account, orders) are not pages to index.
 */
export const PUBLIC_PAGE_PATHS: readonly string[] = [
  ROUTES.home,
  ROUTES.catalogue.list,
  ROUTES.stitched,
  ...Object.values(HELP_PAGE_SLUGS).map(ROUTES.help.page),
  ...Object.values(STORE_PAGE_SLUGS).map(ROUTES.help.page),
];

/*
 * SECURITY — Next writes each address into the sitemap's XML exactly as given,
 * without escaping it, and a product slug is backend data (SEC-02). `new URL`
 * percent-encodes `<`, `>`, `"` and spaces in a path but leaves `&` and `'`, so
 * those are escaped here to the entities XML reads back as the same characters.
 */
const XML_SPECIAL = /[&<>"']/g;
const XML_ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

function xmlSafeUrl(path: string): string {
  return absoluteUrl(path).replace(
    XML_SPECIAL,
    (character) => XML_ENTITIES[character] ?? character,
  );
}

function entryFor(page: SitemapPage): SitemapEntry {
  // The page as a visitor with no language chosen is shown it — the bare
  // address, which is also the default language's own alternate.
  const { canonical, languages } = localeAlternates(page.path, DEFAULT_LOCALE);
  const alternates = Object.fromEntries(
    Object.entries(languages).map(([locale, path]) => [locale, xmlSafeUrl(path)]),
  );

  return {
    url: xmlSafeUrl(canonical),
    ...(page.lastModified === null ? {} : { lastModified: page.lastModified }),
    alternates: { languages: alternates },
  };
}

/** Every page's entry, in the order given. */
export function sitemapEntries(pages: readonly SitemapPage[]): SitemapEntry[] {
  return pages.map(entryFor);
}
