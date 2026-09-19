import { describe, expect, it } from 'vitest';

import { clientEnv } from '@/config/env.client';
import { HELP_PAGE_SLUGS, ROUTES, STORE_PAGE_SLUGS } from '@/config/routes';
import { absoluteUrl } from '@/config/site';
import { DEFAULT_LOCALE, LOCALES } from '@/i18n/locales';

import { localeAlternates } from './locale-alternates';
import { PUBLIC_PAGE_PATHS, sitemapEntries } from './sitemap';

/** §30.5's automatic sitemap: which pages, at which addresses, in which languages. */

const XML_ENTITIES: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
};

/** What an XML parser reads back from a value Next writes into the file verbatim. */
function asXmlReadsIt(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|apos);/g, (entity) => XML_ENTITIES[entity] ?? entity);
}

describe('the public pages the sitemap lists', () => {
  it.each([
    ['the homepage', ROUTES.home],
    ['the catalogue', ROUTES.catalogue.list],
    ['the made-to-measure studio', ROUTES.stitched],
    ...Object.values(HELP_PAGE_SLUGS).map((slug) => [`help page ${slug}`, ROUTES.help.page(slug)]),
    ...Object.values(STORE_PAGE_SLUGS).map((slug) => [
      `store page ${slug}`,
      ROUTES.help.page(slug),
    ]),
  ])('include %s', (_name, path) => {
    expect(PUBLIC_PAGE_PATHS).toContain(path);
  });

  it('list each page once', () => {
    expect(new Set(PUBLIC_PAGE_PATHS).size).toBe(PUBLIC_PAGE_PATHS.length);
  });

  it('leave out search results, which every search term would multiply', () => {
    expect(PUBLIC_PAGE_PATHS).not.toContain(ROUTES.search);
  });
});

describe('sitemapEntries', () => {
  const [entry] = sitemapEntries([{ path: ROUTES.catalogue.list, lastModified: null }]);

  it('gives each page its canonical address in full, on the configured origin', () => {
    expect(entry?.url).toBe(absoluteUrl(ROUTES.catalogue.list));
    expect(entry?.url.startsWith(new URL(clientEnv.NEXT_PUBLIC_APP_URL).origin)).toBe(true);
  });

  it.each(LOCALES)(
    'declares the same page in %s, at the address its own metadata names',
    (locale) => {
      expect(entry?.alternates.languages[locale]).toBe(
        absoluteUrl(
          localeAlternates(ROUTES.catalogue.list, DEFAULT_LOCALE).languages[locale] ?? '',
        ),
      );
    },
  );

  /*
   * TEST-08 — the listed address was the bare one while every alternate carried
   * `?locale=`, so the page a search engine was sent to was in no language's set.
   */
  it('lists each page at an address its own alternates give, as the default and x-default', () => {
    expect(entry?.alternates.languages[DEFAULT_LOCALE]).toBe(entry?.url);
    expect(entry?.alternates.languages['x-default']).toBe(entry?.url);
  });

  it('dates a page only when the backend gave it a date', () => {
    const [undated, dated] = sitemapEntries([
      { path: ROUTES.home, lastModified: null },
      { path: ROUTES.stitched, lastModified: '2026-08-01T00:00:00.000Z' },
    ]);

    expect(undated).not.toHaveProperty('lastModified');
    expect(dated).toHaveProperty('lastModified', '2026-08-01T00:00:00.000Z');
  });

  it('writes a hostile slug so the XML still reads back as that address', () => {
    const path = ROUTES.catalogue.detail(`a&b'c<d>"e`);
    const [hostile] = sitemapEntries([{ path, lastModified: null }]);

    expect(hostile?.url).not.toMatch(/[<>"']|&(?!amp;|lt;|gt;|quot;|apos;)/);
    expect(asXmlReadsIt(hostile?.url ?? '')).toBe(absoluteUrl(path));
    expect(Object.values(hostile?.alternates.languages ?? {})).toEqual(
      [...LOCALES, 'x-default'].map(() =>
        expect.not.stringMatching(/[<>"']|&(?!amp;|lt;|gt;|quot;|apos;)/),
      ),
    );
  });
});
