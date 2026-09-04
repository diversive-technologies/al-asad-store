import { CLIENT } from '@/config/client';
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
function tagFor(locale: Locale): string {
  // Falls back to the bare language when a client adds a locale without a
  // region tag. `Intl` accepts that and simply picks CLDR's own default.
  return CLIENT.market.formatting[locale] ?? locale;
}

/**
 * Money is held and computed in minor units (paisa) as integers. Conversion to
 * a major-unit float happens once, here, immediately before display.
 *
 * DATA-11a: the currency is a fixed constant, never a parameter — this system
 * serves one market in one currency.
 */
export function formatMoneyMinor(amountMinor: number, locale: Locale): string {
  const { currency } = CLIENT.market;

  return new Intl.NumberFormat(tagFor(locale), {
    style: 'currency',
    currency: currency.code,
    maximumFractionDigits: 0,
  }).format(amountMinor / currency.minorUnitsPerMajor);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(tagFor(locale)).format(value);
}

/** Dates cross the wire as ISO-8601 strings (DATA-12) and are parsed here. */
export function formatDate(isoDate: string, locale: Locale): string {
  return new Intl.DateTimeFormat(tagFor(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(isoDate));
}

/** Metreage for unstitched fabric, which is sold by length rather than by size. */
export function formatMetres(metres: number, locale: Locale): string {
  return new Intl.NumberFormat(tagFor(locale), {
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
  const category = new Intl.PluralRules(tagFor(locale)).select(count);
  // `other` is the one category every locale defines, so it is the only safe
  // fallback when a translation omits a form.
  const template = forms[category] ?? forms.other ?? '';

  return formatTemplate(template, { count: formatNumber(count, locale) });
}

/**
 * I18N-06 — THE placeholder substitution, so a parameterised message is filled
 * in exactly one place.
 *
 * Values arrive already formatted, because only the caller knows what kind of
 * value it is: money goes through `formatMoneyMinor`, counts through
 * `formatNumber`. This function only substitutes, and an unknown placeholder is
 * left intact rather than replaced with `undefined` — a visible `{min}` in the
 * interface is a bug report; the word "undefined" is a mystery.
 */
export function formatTemplate(
  template: string,
  values: Readonly<Record<string, string>>,
): string {
  return template.replace(/\{(\w+)\}/g, (match: string, key: string) => values[key] ?? match);
}
