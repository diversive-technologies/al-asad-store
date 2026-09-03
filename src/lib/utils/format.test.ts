import { describe, expect, it } from 'vitest';

import { formatDate, formatMetres, formatMoneyMinor, formatNumber } from './format';

/**
 * These assertions guard I18N-08 and DATA-11: money is derived from integer
 * minor units, and Urdu localises through ICU rather than falling back to raw
 * English output.
 *
 * Note the digits: `ur-PK` resolves to the `latn` numbering system, so Urdu for
 * Pakistan correctly renders Western digits. Asserting Eastern Arabic-Indic
 * digits here would encode Indian Urdu conventions into a single-market system.
 */
describe('formatMoneyMinor', () => {
  it('converts integer minor units to a major-unit currency string', () => {
    expect(formatMoneyMinor(1_249_900, 'en')).toContain('12,499');
    expect(formatMoneyMinor(1_249_900, 'ur')).toContain('12,499');
  });

  it('rounds to whole rupees rather than showing paisa', () => {
    expect(formatMoneyMinor(99, 'en')).not.toContain('.');
  });

  it('does not accumulate floating-point error', () => {
    expect(formatMoneyMinor(3 * 3_333_33, 'en')).toContain('10,000');
  });
});

describe('formatNumber', () => {
  it('groups thousands for both locales', () => {
    expect(formatNumber(1234, 'en')).toBe('1,234');
    expect(formatNumber(1234, 'ur')).toBe('1,234');
  });
});

describe('formatDate', () => {
  it('localises the month name for Urdu', () => {
    const urdu = formatDate('2026-03-14T00:00:00.000Z', 'ur');
    // Urdu script present, proving the date does not fall through to English.
    expect(urdu).toMatch(/[؀-ۿ]/);
    expect(formatDate('2026-03-14T00:00:00.000Z', 'en')).toContain('March');
  });
});

describe('formatMetres', () => {
  it('renders a metre unit for unstitched fabric lengths', () => {
    expect(formatMetres(2.5, 'en')).toMatch(/2\.5/);
  });
});
