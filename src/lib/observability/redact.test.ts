import { describe, expect, it } from 'vitest';

import { maskPersonalData } from './redact';

/** F-08 — nothing that identifies a customer goes to the error tracker. */
describe('maskPersonalData', () => {
  it.each([
    ['an email', 'failed for ali@example.com today', 'failed for [email] today'],
    ['an email with a plus tag', 'to ali+shop@mail.example.co.uk.', 'to [email].'],
    ['an email in brackets and quotes', 'user "a.b@x.org" (c@y.io)', 'user "[email]" ([email])'],
    ['a national mobile', 'mobile 03001234567 refused', 'mobile [phone] refused'],
    ['an international mobile', 'called +92 300 1234567 twice', 'called [phone] twice'],
    ['a dashed mobile', 'number 0300-1234567.', 'number [phone].'],
    ['a bracketed number', 'rang (0300) 1234567', 'rang [phone]'],
  ])('masks %s', (_label, text, expected) => {
    expect(maskPersonalData(text)).toBe(expected);
  });

  it('masks every occurrence, of both kinds', () => {
    const masked = maskPersonalData('a@b.co and c@d.co both used 03001234567 and 03111234567');

    expect(masked).toBe('[email] and [email] both used [phone] and [phone]');
  });

  it.each([
    'CONTRACT_VIOLATION: Backend response did not match the expected schema.',
    'SERVER: The store responded with an error. status 503',
    'order AA100001 at /api/checkout/order',
    'product 00ab12cd-0001-4c8a-8f21-000000000001 not found',
    'took 12345 ms',
    'items.0.id invalid_type',
  ])('leaves diagnostic text alone: %s', (text) => {
    expect(maskPersonalData(text)).toBe(text);
  });

  it('leaves no digit run of nine or more behind', () => {
    expect(maskPersonalData('ids 123456789 and 1 234 567 890 end')).not.toMatch(/\d{9}/);
  });
});
