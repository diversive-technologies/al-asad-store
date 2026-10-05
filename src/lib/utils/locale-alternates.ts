import { CLIENT } from '@/config/client';
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
 * F-10: when `CLIENT.features.languageSwitcher` is `false`, publishes only the
 * default language and `x-default`, and canonical is always the default language's.
 */
export function localeAlternates(
  path: string,
  locale: Locale,
  isSwitchOffered: boolean = CLIENT.features.languageSwitcher,
): LocaleAlternates {
  const offeredLocales = isSwitchOffered ? LOCALES : [DEFAULT_LOCALE];
  const languages = Object.fromEntries([
    ...offeredLocales.map((code) => [code, addressIn(path, code)]),
    [X_DEFAULT, addressIn(path, DEFAULT_LOCALE)],
  ]);

  const activeLocale = isSwitchOffered ? locale : DEFAULT_LOCALE;
  return { canonical: addressIn(path, activeLocale), languages };
}
