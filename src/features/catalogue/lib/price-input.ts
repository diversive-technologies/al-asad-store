import { CLIENT } from '@/config/client';

/**
 * MOD-04 — pure, React-free, unit-testable. The only translation between the
 * rupee figure a customer types and the integer minor units the contract
 * carries (DATA-11).
 *
 * It lives here rather than inside the price input because it is where the
 * awkward cases are decided, and those decisions deserve tests rather than a
 * reviewer's trust: an empty box, a stray space, `12abc`, a negative bound, a
 * fractional paisa.
 */

/**
 * An empty or unreadable box means "no bound", never zero.
 *
 * The distinction is load-bearing. `priceMinMinor: 0` is a filter that happens
 * to match everything; `null` is the absence of a filter, and only the second
 * one drops out of the canonical URL. Treating a cleared box as zero would
 * leave `?priceMin=0` glued to the address forever.
 */
export function parsePriceInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const major = Number(trimmed);
  // `Number` accepts '', whitespace and Infinity; none of them is a price.
  if (!Number.isFinite(major) || major < 0) return null;

  return Math.round(major * CLIENT.market.currency.minorUnitsPerMajor);
}

/**
 * The inverse, for pre-filling the boxes from the URL.
 *
 * Deviation stated (§22-J, I18N-08): this returns an unlocalised numeric
 * string rather than going through `formatNumber`. The value of an
 * `<input type="number">` is not prose — HTML requires a valid floating-point
 * number, so a thousands separator or a localised decimal mark makes the
 * control read as empty. User-visible price *text* still goes through
 * `formatMoneyMinor` everywhere else.
 */
export function formatPriceInput(minor: number | null): string {
  if (minor === null) return '';

  return String(minor / CLIENT.market.currency.minorUnitsPerMajor);
}
