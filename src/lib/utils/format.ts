import { CURRENCY, MINOR_UNITS_PER_MAJOR } from '@/config/constants';
import type { Locale } from '@/i18n/locales';

/**
 * I18N-08 / DATA-11 / DATA-12 — THE locale-aware formatters.
 *
 * Raw `.toString()`, `.toFixed()` and template interpolation of a numeric value
 * into user-visible text are PROHIBITED: they bypass locale entirely and emit
 * English date order regardless of the reader.
 *
 * DELIBERATE, verified against ICU — do not "fix" this by forcing a numbering
 * system. CLDR's default for `ur-PK` is `latn`: Urdu as written in Pakistan
 * uses Western digits, while `ur-IN` defaults to Eastern Arabic-Indic
 * (`۱۲۳`). Appending `-u-nu-arabext` would render digits correctly for Indian
 * Urdu and wrongly for this system's only market (DATA-11a). Month names,
 * currency placement and date order still localise.
 */
const BCP47: Record<Locale, string> = { en: 'en-PK', ur: 'ur-PK' };

/**
 * Money is held and computed in minor units (paisa) as integers. Conversion to
 * a major-unit float happens once, here, immediately before display.
 *
 * DATA-11a: the currency is a fixed constant, never a parameter — this system
 * serves one market in one currency.
 */
export function formatMoneyMinor(amountMinor: number, locale: Locale): string {
  return new Intl.NumberFormat(BCP47[locale], {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(amountMinor / MINOR_UNITS_PER_MAJOR);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(BCP47[locale]).format(value);
}

/** Dates cross the wire as ISO-8601 strings (DATA-12) and are parsed here. */
export function formatDate(isoDate: string, locale: Locale): string {
  return new Intl.DateTimeFormat(BCP47[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(isoDate));
}

/** Metreage for unstitched fabric, which is sold by length rather than by size. */
export function formatMetres(metres: number, locale: Locale): string {
  return new Intl.NumberFormat(BCP47[locale], {
    style: 'unit',
    unit: 'meter',
    unitDisplay: 'short',
    maximumFractionDigits: 2,
  }).format(metres);
}

/**
 * I18N-07 — plural selection through the locale's own rules, never a ternary.
 *
 * `count === 1 ? 'item' : 'items'` hard-codes English grammar into the
 * component tree. Urdu's categories are not English's, and a language added
 * later may have three or six. `Intl.PluralRules` knows them; we do not.
 *
 * I18N-08 — the number is formatted through the locale formatter as well, so
 * the digits match the surrounding text rather than defaulting to Latin.
 */
export function formatPlural(
  forms: Readonly<Record<string, string>>,
  count: number,
  locale: Locale,
): string {
  const category = new Intl.PluralRules(BCP47[locale]).select(count);
  // `other` is the one category every locale defines, so it is the only safe
  // fallback when a translation omits a form.
  const template = forms[category] ?? forms.other ?? '';

  return template.replace('{count}', formatNumber(count, locale));
}
