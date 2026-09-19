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
 * A valid `?locale=` wins — it is somebody asking for that language, by a link
 * or an alternate — and is remembered, exactly as the cookie a language switch
 * sets. SEC-02: both inputs are untrusted, so a query value that is not a locale
 * is ignored rather than trusted, and a missing or tampered cookie is replaced
 * with the default.
 */
export function localeToRemember(queryValue: string | null, cookieValue: unknown): Locale | null {
  if (isLocale(queryValue)) return queryValue === cookieValue ? null : queryValue;
  return isLocale(cookieValue) ? null : DEFAULT_LOCALE;
}

/** Where the language switch is drawn: the header, the foot of the page, or nowhere. */
export type LocaleSwitchPlace = 'HEADER' | 'FOOTER' | null;

/**
 * Where the language switch goes, for a visitor reading `current`.
 *
 * The deployment's own switch sits in the header, when it offers one
 * (`features.languageSwitcher`). A deployment may not — this one does not,
 * while its Urdu awaits review — but a visitor can still ARRIVE reading another
 * language, by a `?locale=` link or an `hreflang` alternate, and that choice is
 * remembered for a year. Such a visitor is always offered the way back, at the
 * foot of the page, which takes no room from a bar the deployment chose to keep
 * clear; without it the only ways out are editing the address by hand or
 * clearing the store's cookies. A visitor reading the default is offered
 * nothing the deployment did not ask to offer.
 */
export function localeSwitchPlace(current: Locale, isSwitchOffered: boolean): LocaleSwitchPlace {
  if (LOCALES.length < 2) return null;
  if (isSwitchOffered) return 'HEADER';
  return current === DEFAULT_LOCALE ? null : 'FOOTER';
}
