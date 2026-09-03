/** I18N-03 — THE locale list, default and direction map. Leaf module (MOD-01). */
export const LOCALES = ['en', 'ur'] as const; // TS-10: no enum
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'locale';

/** Direction is derived from locale in exactly one place. */
export const DIRECTION: Record<Locale, 'ltr' | 'rtl'> = { en: 'ltr', ur: 'rtl' };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
