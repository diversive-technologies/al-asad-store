import { describe, expect, it } from 'vitest';

import { ROUTES } from '@/config/routes';
import { DEFAULT_LOCALE, LOCALES } from '@/i18n/locales';

import { localeAlternates } from './locale-alternates';

/** Whichever language is not the default — found, never named (D5). */
const OTHER_LOCALES = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);

/**
 * TEST-08 — every page inherited `canonical: '/'` from the root layout, so every
 * product, listing and help page named the homepage as its canonical address.
 */
describe('a page’s canonical address and its alternates', () => {
  it('names the page itself, not the homepage', () => {
    expect(
      localeAlternates(ROUTES.catalogue.detail('plain-suit-1'), DEFAULT_LOCALE).canonical,
    ).toBe('/catalogue/plain-suit-1');
  });

  it('offers the default language at the bare address, which is also the x-default', () => {
    const { languages } = localeAlternates(ROUTES.catalogue.list, DEFAULT_LOCALE);

    expect(languages[DEFAULT_LOCALE]).toBe(ROUTES.catalogue.list);
    expect(languages['x-default']).toBe(ROUTES.catalogue.list);
  });

  it.each(OTHER_LOCALES)('offers the SAME page in %s, chosen by the locale parameter', (locale) => {
    const { languages } = localeAlternates(ROUTES.catalogue.list, DEFAULT_LOCALE);
    const address = new URL(languages[locale] ?? '', 'https://store.test');

    expect(address.pathname).toBe(ROUTES.catalogue.list);
    expect(address.searchParams.get('locale')).toBe(locale);
  });

  /*
   * TEST-08 — the Urdu render named the bare, English address as its canonical
   * while its alternates all carried `?locale=`, so no language version was its
   * own canonical and a search engine would ignore the whole hreflang cluster.
   */
  it.each(LOCALES)(
    'names, rendered in %s, that language’s own address — the one its alternates give',
    (locale) => {
      const { canonical, languages } = localeAlternates(ROUTES.catalogue.list, locale);

      expect(canonical).toBe(languages[locale]);
    },
  );

  it('gives every language version a different canonical address', () => {
    const canonicals = LOCALES.map(
      (locale) => localeAlternates(ROUTES.catalogue.list, locale).canonical,
    );

    expect(new Set(canonicals).size).toBe(LOCALES.length);
  });

  it('gives no two pages the same canonical address', () => {
    const pages = [
      ROUTES.home,
      ROUTES.catalogue.list,
      ROUTES.catalogue.detail('plain-suit-1'),
      ROUTES.help.page('size-guide'),
      ROUTES.search,
      ROUTES.stitched,
    ];
    const canonicals = pages.map((path) => localeAlternates(path, DEFAULT_LOCALE).canonical);

    expect(new Set(canonicals).size).toBe(pages.length);
  });
});
