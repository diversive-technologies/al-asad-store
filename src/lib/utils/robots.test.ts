import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ROUTES } from '@/config/routes';
import { absoluteUrl } from '@/config/site';

import { CRAWL_EXCLUDED_PATHS, robotsRules } from './robots';
import { PUBLIC_PAGE_PATHS } from './sitemap';

/**
 * §30.5 — robots.txt, held to the decisions the pages already make. A page that
 * says `index: false` in its own metadata is one a crawler is kept out of, and a
 * page that does not say it is one a crawler may read. Reading the route files,
 * as `page-canonicals.test.ts` does, is what makes a new private page that is
 * left out of robots.txt — or a public one caught by it — fail here.
 */
const APP = fileURLToPath(new URL('../../../app', import.meta.url));

function pagesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return pagesUnder(path);
    return entry.name === 'page.tsx' ? [path] : [];
  });
}

/** `order/[orderNumber]/page.tsx` → `/order/[orderNumber]`; a `(group)` is not in the address. */
function addressOf(file: string): string {
  const segments = relative(APP, file)
    .replaceAll('\\', '/')
    .split('/')
    .slice(0, -1)
    .filter((segment) => !/^\(.*\)$/.test(segment));
  return `/${segments.join('/')}`;
}

const pages = pagesUnder(APP).map((file) => ({
  address: addressOf(file),
  isNoIndex: /index:\s*false/.test(readFileSync(file, 'utf8')),
}));

const PAGE_PREFIXES = CRAWL_EXCLUDED_PATHS.filter((path) => path !== ROUTES.apiPrefix);

/** Every BFF path, a builder's with a stand-in id. */
const BFF_PATHS = Object.values(ROUTES.api).map((route) =>
  typeof route === 'function' ? route('any') : route,
);

const isExcluded = (address: string): boolean =>
  CRAWL_EXCLUDED_PATHS.some((prefix) => address.startsWith(prefix));

describe('robots.txt', () => {
  it('lets every crawler read the store, keeps it out of the private paths, and names the sitemap', () => {
    expect(robotsRules()).toEqual({
      rules: { userAgent: '*', allow: '/', disallow: [...CRAWL_EXCLUDED_PATHS] },
      sitemap: absoluteUrl(ROUTES.sitemap),
    });
    expect(robotsRules().sitemap).toMatch(/^https?:\/\/[^/]+\/sitemap\.xml$/);
  });

  it.each(['/api/', '/account', '/bag', '/checkout', '/order/', '/sign-in'])(
    'keeps crawlers out of %s',
    (path) => {
      expect(CRAWL_EXCLUDED_PATHS).toContain(path);
    },
  );

  it.each(pages.filter((page) => page.isNoIndex).map((page) => page.address))(
    'excludes %s, which asks not to be indexed',
    (address) => {
      expect(isExcluded(address)).toBe(true);
    },
  );

  it.each(pages.filter((page) => !page.isNoIndex).map((page) => page.address))(
    'lets crawlers read %s, which asks to be indexed',
    (address) => {
      expect(isExcluded(address)).toBe(false);
    },
  );

  it.each(PAGE_PREFIXES)('excludes %s only because a noindex page lives there', (prefix) => {
    expect(pages.filter((page) => page.isNoIndex && page.address.startsWith(prefix))).not.toEqual(
      [],
    );
  });

  it('covers every BFF path with the one prefix it excludes', () => {
    expect(BFF_PATHS).toEqual(BFF_PATHS.map(() => expect.stringMatching(/^\/api\//)));
    expect(ROUTES.apiPrefix).toBe('/api/');
  });
});

describe('the sitemap and robots.txt', () => {
  it.each(PUBLIC_PAGE_PATHS)('agree that %s may be crawled', (path) => {
    expect(isExcluded(path)).toBe(false);
  });

  it('agree that a product page may be crawled', () => {
    expect(isExcluded(ROUTES.catalogue.detail('any-product'))).toBe(false);
  });
});
