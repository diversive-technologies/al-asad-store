import { CLIENT } from '@/config/client';

/** I18N-03 — THE locale list, default and direction map. Leaf module (MOD-01). */
export const LOCALES = ['en', 'ur'] as const; // TS-10: no enum
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'locale';

/**
 * The query parameter that CHOOSES a language, as `?locale=ur`.
 *
 * §30.5 publishes both locales and cross-links them, and a crawler following an
 * `hreflang` alternate carries no cookie — so the language has to be selectable
 * from the address itself. `proxy.ts` reads it; the alternates write it.
 */
export const LOCALE_QUERY_PARAM = 'locale';

/** Direction is derived from locale in exactly one place. */
export const DIRECTION: Record<Locale, 'ltr' | 'rtl'> = { en: 'ltr', ur: 'rtl' };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Which locale cookie a request should LEAVE with, or `null` when the one it
 * carries is already right.
 *
 * F-10: when `features.languageSwitcher` is off, `localeToRemember` never returns
 * a non-default locale (returns `null` so no locale cookie is written).
 *
 * When the switch is offered:
 * A valid `?locale=` wins — it is somebody asking for that language, by a link
 * or an alternate — and is remembered, exactly as the cookie a language switch
 * sets. SEC-02: both inputs are untrusted, so a query value that is not a locale
 * is ignored rather than trusted, and a missing or tampered cookie is replaced
 * with the default.
 */
export function localeToRemember(
  queryValue: string | null,
  cookieValue: unknown,
  isSwitchOffered: boolean = CLIENT.features.languageSwitcher,
): Locale | null {
  if (!isSwitchOffered) return null;
  if (isLocale(queryValue)) return queryValue === cookieValue ? null : queryValue;
  return isLocale(cookieValue) ? null : DEFAULT_LOCALE;
}

/** Where the language switch is drawn: the header, the foot of the page, or nowhere. */
export type LocaleSwitchPlace = 'HEADER' | 'FOOTER' | null;

/**
 * Where the language switch goes, for a visitor reading `current`.
 *
 * F-10: when `features.languageSwitcher` is false, Urdu is disabled and the
 * switch is drawn nowhere (`null`).
 * When offered, the switch sits in the header.
 */
export function localeSwitchPlace(
  _current: Locale,
  isSwitchOffered: boolean = CLIENT.features.languageSwitcher,
): LocaleSwitchPlace {
  if (LOCALES.length < 2 || !isSwitchOffered) return null;
  return 'HEADER';
}
