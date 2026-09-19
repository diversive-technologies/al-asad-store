import { beforeEach, describe, expect, it } from 'vitest';

import { addItem, createCart, resetCarts } from './bag-db';
import { resetReservations } from './bag-reservations';
import { CATALOGUE } from './catalogue-db';
import { placeOrder, quoteFor, resetOrders } from './checkout-db';
import { onHandFor } from './inventory-db';
import {
  grantHistoryFor,
  grantOrderAccess,
  lookupOrder,
  readableOrder,
  resetOrderAccess,
} from './order-access-db';
import { toProductDetail } from './product-detail-db';

/**
 * §28.3 — an order is read by the account that placed it, by a browser holding a
 * token issued for it, or after its mobile number is proved. Everyone else must
 * get exactly the answer an unknown number gets, or the read becomes a way to walk
 * the sequence of order numbers and read the names, addresses and measurements
 * behind them.
 */

const MOBILE = '0300-1234567';

/** Places one stock order and answers its number. */
function placed(accountKey: string | null): string {
  for (const record of CATALOGUE) {
    if (record.garmentType === 'unstitched') continue;
    const pieces = toProductDetail(record, 'en').pieces;
    const selections = pieces.flatMap((piece) => {
      const size = piece.sizes.find((entry) => onHandFor(piece.id, entry.id) > 0);
      return size === undefined ? [] : [{ pieceId: piece.id, sizeId: size.id }];
    });

    const cartId = createCart();
    if (addItem(cartId, record.id, selections, 1, 'en').kind !== 'ADDED') continue;

    const quote = quoteFor(cartId, 'en', 'standard', false);
    const outcome = placeOrder(
      cartId,
      {
        contactName: 'Test Customer',
        contactMobile: MOBILE,
        contactEmail: '',
        addressLine: '12 Example Street, Block A',
        addressCity: 'Lahore',
        deliveryOptionId: 'standard',
        paymentMethodId: 'cod',
        isGift: false,
        giftMessage: '',
        expectedTotalMinor: quote?.totals.totalMinor ?? 0,
      },
      'en',
      accountKey,
    );
    if (outcome.kind === 'PLACED') return outcome.order.orderNumber;
  }
  throw new Error('No product in the fixture could be ordered.');
}

const NOBODY = { accountKey: null, accessToken: null };

beforeEach(() => {
  resetCarts();
  resetReservations();
  resetOrders();
  resetOrderAccess();
});

describe('reading an order', () => {
  it('serves the account that placed it', () => {
    const number = placed('customer@example.com');

    expect(
      readableOrder(number, { accountKey: 'customer@example.com', accessToken: null }),
    ).not.toBeNull();
  });

  it('serves a browser presenting the token issued at placement', () => {
    const number = placed(null);
    const token = grantOrderAccess(number, 'PLACEMENT');

    expect(readableOrder(number, { accountKey: null, accessToken: token })?.orderNumber).toBe(
      number,
    );
  });

  it.each([
    ['nothing at all', () => NOBODY],
    ['another account', () => ({ accountKey: 'someone@example.com', accessToken: null })],
    [
      'a token that was never issued',
      () => ({ accountKey: null, accessToken: crypto.randomUUID() }),
    ],
  ])('refuses a reader presenting %s', (_label, reader) => {
    const number = placed('customer@example.com');

    expect(readableOrder(number, reader())).toBeNull();
  });

  it("refuses a token issued for a DIFFERENT order, even one the reader's own", () => {
    const mine = placed(null);
    const theirs = placed(null);
    const token = grantOrderAccess(mine, 'PLACEMENT');

    expect(readableOrder(theirs, { accountKey: null, accessToken: token })).toBeNull();
  });

  it('never matches a guest order to an account, whatever the key', () => {
    const number = placed(null);

    expect(readableOrder(number, { accountKey: '', accessToken: null })).toBeNull();
  });

  it('answers an unknown number exactly as it answers a refused reader', () => {
    const number = placed(null);

    expect(readableOrder('AA999999', NOBODY)).toEqual(readableOrder(number, NOBODY));
  });
});

describe('§28.3 finding an order by number and mobile', () => {
  it.each([
    ['exactly as it was typed', MOBILE],
    ['with the spacing written differently', '0300 1234567'],
    ['with no separator at all', '03001234567'],
  ])('matches the mobile %s, and the token it answers then reads the order', (_l, mobile) => {
    const number = placed(null);

    const found = lookupOrder(number, mobile);

    expect(found?.order.orderNumber).toBe(number);
    expect(
      readableOrder(number, { accountKey: null, accessToken: found?.accessToken ?? null }),
    ).not.toBeNull();
  });

  it.each([
    ['a wrong mobile', (number: string) => number, '03119876543'],
    ['an empty mobile', (number: string) => number, ''],
    ['a number that names no order', () => 'AA999999', MOBILE],
  ])('answers %s with the same null', (_label, numberFor, mobile) => {
    const number = placed(null);

    expect(lookupOrder(numberFor(number), mobile)).toBeNull();
  });

  it('keeps every grant on record, so an earlier token still reads (D6)', () => {
    const number = placed(null);
    const first = grantOrderAccess(number, 'PLACEMENT');

    lookupOrder(number, MOBILE);

    expect(grantHistoryFor(number)).toEqual([{ route: 'PLACEMENT' }, { route: 'MOBILE' }]);
    expect(readableOrder(number, { accountKey: null, accessToken: first })).not.toBeNull();
  });
});

/*
 * K5 — which spellings name one order is the BACKEND's rule (DATA-13, stated
 * once as `canonicalOrderNumber`): a customer copying `aa100001` from a message,
 * or typing it with a space, means the same order. The storefront passes on what
 * was typed and never decides it.
 */
describe('§28.3 an order number spelt another way', () => {
  it.each([
    ['in lower case', (number: string) => number.toLowerCase()],
    ['with spaces around it', (number: string) => ` ${number} `],
  ])('finds the order %s, and the token it answers reads it', (_label, spell) => {
    const number = placed(null);

    const found = lookupOrder(spell(number), MOBILE);
    const reader = { accountKey: null, accessToken: found?.accessToken ?? null };

    expect(found?.order.orderNumber).toBe(number);
    expect(readableOrder(spell(number), reader)?.orderNumber).toBe(number);
    // The grant is recorded against the order, however the number was spelt.
    expect(grantHistoryFor(spell(number))).toEqual([{ route: 'MOBILE' }]);
  });
});
