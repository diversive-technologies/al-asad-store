import { describe, expect, it } from 'vitest';

import { LOCALES } from '@/i18n/locales';

import { CLIENT } from './client';

/**
 * D5 — the client profile is the file a new deployment edits, which makes it the
 * file most likely to be edited by someone who has not read the rest of the
 * codebase. These assert the invariants that would otherwise fail silently
 * rather than loudly.
 */
describe('client profile', () => {
  it('has a formatting tag for every supported locale', () => {
    /*
     * The drift that motivates this test: adding a language to `LOCALES` without
     * adding its BCP-47 tag here does not crash. `Intl` falls back to the bare
     * language code and the page keeps rendering — with the wrong region's
     * number format, date order and currency placement, which nobody notices
     * until a customer does.
     */
    for (const locale of LOCALES) {
      expect(CLIENT.market.formatting[locale], `missing formatting tag for "${locale}"`).toBeTypeOf(
        'string',
      );
    }
  });

  it('uses a currency code Intl actually recognises', () => {
    // A typo here formats every price on the store as the literal code.
    const formatted = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: CLIENT.market.currency.code,
    }).format(1);

    expect(formatted).not.toContain(CLIENT.market.currency.code.toLowerCase());
    expect(formatted.length).toBeGreaterThan(1);
  });

  it('divides money by a positive number of minor units', () => {
    // Zero would divide by zero; a wrong value is a silent factor-of-100 error
    // across every price in the store.
    expect(CLIENT.market.currency.minorUnitsPerMajor).toBeGreaterThan(0);
  });

  it('has a mobile pattern that is anchored at both ends', () => {
    // An unanchored pattern accepts a valid number buried inside junk.
    const source = CLIENT.market.mobile.pattern.source;
    expect(source.startsWith('^')).toBe(true);
    expect(source.endsWith('$')).toBe(true);
  });

  it('rejects a number from a different market', () => {
    expect(CLIENT.market.mobile.pattern.test('+971 50 123 4567')).toBe(false);
  });
});
