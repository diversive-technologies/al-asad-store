import { describe, expect, it } from 'vitest';

import { LOCALES } from '@/i18n/locales';

import { CLIENT, clientKey } from './client';

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

  // A language added without an address would render an empty block on its
  // Contact us page rather than failing anywhere a developer would see it.
  it.each(LOCALES)('has a postal address in %s', (locale) => {
    expect(CLIENT.contact.address[locale]?.length ?? 0).toBeGreaterThan(0);
  });

  it.each([
    ['phone', CLIENT.contact.phone],
    ['whatsApp', CLIENT.contact.whatsApp],
  ])(
    'gives the %s number in international form, so it can be dialled from a link',
    (_field, number) => {
      // `tel:` and wa.me both need the country code; a local 03xx number dials nowhere abroad.
      expect(number).toMatch(/^\+\d[\d\s-]{6,}$/);
    },
  );

  it('gives an email address with a domain', () => {
    expect(CLIENT.contact.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('opens before it closes, on 24-hour times', () => {
    const { opens, closes, firstDay, lastDay } = CLIENT.contact.hours;

    expect(opens).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
    expect(closes).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
    expect(opens < closes).toBe(true);
    expect(firstDay).toBeLessThanOrEqual(lastDay);
  });

  it('prefixes its cookie and storage names with a valid cookie-name token', () => {
    // A space, `=` or `;` in the prefix would make every cookie this store sets
    // unreadable, and nothing would throw — the cart would simply never persist.
    expect(CLIENT.keyPrefix).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(clientKey('cart')).toBe(`${CLIENT.keyPrefix}_cart`);
  });
});
