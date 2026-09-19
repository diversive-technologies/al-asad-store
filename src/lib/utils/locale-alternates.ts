import { DEFAULT_LOCALE, LOCALE_QUERY_PARAM, LOCALES, type Locale } from '@/i18n/locales';

/** The shape Next's `Metadata['alternates']` takes, stated without importing Next. */
export interface LocaleAlternates {
  readonly canonical: string;
  /** One address per locale in `LOCALES`, keyed by its code, and `x-default`. */
  readonly languages: Readonly<Record<string, string>>;
}

/** The address search engines are sent to when no language version fits the reader. */
const X_DEFAULT = 'x-default';

/**
 * The page at `path` in `locale`: the bare address for the default language,
 * which is what a visitor with no choice made is shown, and `?locale=` for any
 * other, which `proxy.ts` honours on the first load.
 */
function addressIn(path: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return path;
  const params = new URLSearchParams({ [LOCALE_QUERY_PARAM]: locale });
  return `${path}?${params.toString()}`;
}

/**
 * §30.5 — one page's canonical address in the language it was rendered in, and
 * the same page in every locale.
 *
 * Each indexable page calls this from its OWN `generateMetadata` with its own
 * path and the locale it rendered. It used to be emitted once by the root layout
 * with `canonical: '/'`, which every route inherited — so every product, listing
 * and help page told search engines it was a duplicate of the homepage.
 *
 * `path` is the page's canonical address from `ROUTES` (SSOT-02), without a
 * query: a filtered or paged view names its unfiltered page, which is what §30.5
 * means by "filtered views marked so the canonical category page is indexed".
 * Relative, so `metadataBase` resolves it.
 *
 * The canonical and the alternates AGREE, per language: each language version
 * names its own address as canonical, and that address is among its alternates.
 * The Urdu render used to name the bare, English address as its canonical while
 * every alternate carried a `?locale=` — so each language version declared
 * itself a duplicate of another, and a search engine meeting that conflict
 * ignores the whole cluster.
 */
export function localeAlternates(path: string, locale: Locale): LocaleAlternates {
  const languages = Object.fromEntries([
    ...LOCALES.map((code) => [code, addressIn(path, code)]),
    [X_DEFAULT, addressIn(path, DEFAULT_LOCALE)],
  ]);

  return { canonical: addressIn(path, locale), languages };
}
