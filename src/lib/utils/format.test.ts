import { describe, expect, it } from 'vitest';

import {
  formatClockTime,
  formatDate,
  formatMetres,
  formatMoneyMinor,
  formatNumber,
  formatWeekday,
} from './format';

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

describe('formatWeekday', () => {
  it.each([
    [1, 'en', 'Monday'],
    [6, 'en', 'Saturday'],
    [7, 'en', 'Sunday'],
    [1, 'ur', 'پیر'],
    [7, 'ur', 'اتوار'],
  ] as const)('names ISO day %i in %s as %s', (day, locale, name) => {
    expect(formatWeekday(day, locale)).toBe(name);
  });
});

describe('formatClockTime', () => {
  it('writes a 24-hour time the way the locale writes clock times', () => {
    expect(formatClockTime('19:00', 'en')).toMatch(/^7:00\s?pm$/i);
    expect(formatClockTime('10:30', 'en')).toMatch(/^10:30\s?am$/i);
  });

  it('keeps the hour whatever time zone the server runs in', () => {
    // Read in UTC on both sides, so midnight never slips to the previous day.
    expect(formatClockTime('00:15', 'en')).toMatch(/^12:15\s?am$/i);
  });
});
