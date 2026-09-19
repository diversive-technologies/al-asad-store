import { describe, expect, it } from 'vitest';

import { orderAccessTokenSchema, orderNumberSchema } from '@/lib/domain/ids';

import {
  MAX_REMEMBERED_ORDERS,
  parseOrderGrants,
  serialiseOrderGrants,
  tokenFor,
  withOrderGrant,
  type OrderGrant,
} from './order-grants';

function grant(number: string, token: string = crypto.randomUUID()): OrderGrant {
  return {
    orderNumber: orderNumberSchema.parse(number),
    token: orderAccessTokenSchema.parse(token),
  };
}

describe('the remembered order grants', () => {
  it('reads back exactly what it wrote', () => {
    const grants = [grant('AA100002'), grant('AA100001')];

    expect(parseOrderGrants(serialiseOrderGrants(grants))).toEqual(grants);
  });

  /* SEC-02 — the cookie is untrusted. A malformed entry is dropped, never
     trusted, and it does not take the good entries down with it. */
  it.each([
    ['a number that could rewrite a path', '../../account.aaaaaaaaaaaaaaaaaaaa'],
    ['a token too short to be one', 'AA100003.short'],
    ['an entry with a third part', 'AA100003.aaaaaaaaaaaaaaaaaaaa.extra'],
    ['a bare number', 'AA100003'],
  ])('drops %s and keeps the rest', (_label, bad) => {
    const good = grant('AA100001');
    const raw = `${bad}~${serialiseOrderGrants([good])}`;

    expect(parseOrderGrants(raw)).toEqual([good]);
  });

  it.each([undefined, ''])('holds nothing when the cookie is %s', (raw) => {
    expect(parseOrderGrants(raw)).toEqual([]);
  });

  it('puts the newest order first and replaces an older token for the same order', () => {
    const first = grant('AA100001');
    const newer = grant('AA100001');

    const grants = withOrderGrant([first, grant('AA100002')], newer);

    expect(grants.map((entry) => entry.orderNumber)).toEqual(['AA100001', 'AA100002']);
    expect(tokenFor(grants, first.orderNumber)).toBe(newer.token);
  });

  it(`remembers at most ${String(MAX_REMEMBERED_ORDERS)} orders, dropping the oldest`, () => {
    const many = Array.from({ length: MAX_REMEMBERED_ORDERS }, (_, index) =>
      grant(`AA${String(100_001 + index)}`),
    );

    const grants = withOrderGrant(many, grant('AA999999'));

    expect(grants).toHaveLength(MAX_REMEMBERED_ORDERS);
    expect(grants[0]?.orderNumber).toBe('AA999999');
    expect(
      tokenFor(grants, orderNumberSchema.parse(`AA${String(100_000 + MAX_REMEMBERED_ORDERS)}`)),
    ).toBeNull();
  });

  it('answers null for an order this browser holds no token for', () => {
    expect(tokenFor([grant('AA100001')], orderNumberSchema.parse('AA100002'))).toBeNull();
  });
});
