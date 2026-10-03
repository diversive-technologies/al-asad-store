import { describe, expect, it } from 'vitest';

import {
  afterFailure,
  afterRefusal,
  type PlacementFollowUp,
  type PlacementRefusal,
} from './placement-outcome';

/**
 * What checkout says and reads again after a placement that did not leave for
 * the order.
 *
 * TEST-08 — two defects pinned here. A lapsed hold did not re-read the quote,
 * so the next press was refused again for a total that still counted the lapsed
 * items (F10). And every failure said "not placed, nothing charged", including
 * a reply lost after the order was committed (F2).
 */

const TOTALS = {
  subtotalMinor: 700_000,
  discountMinor: 0,
  deliveryMinor: 25_000,
  giftMinor: 0,
  totalMinor: 725_000,
};

const FAILED = 'not placed, nothing charged';
const WAIT = 'please wait a few minutes';

describe('afterRefusal', () => {
  it.each<[string, PlacementRefusal, boolean, boolean]>([
    ['a lapsed hold', { kind: 'RESERVATION_EXPIRED', expiredItems: ['Kurta'] }, true, true],
    ['a moved price', { kind: 'PRICE_CHANGED', totals: TOTALS }, true, false],
    [
      'measurements saved again',
      { kind: 'MEASUREMENTS_CHANGED', restitchedItems: ['Kurta'] },
      false,
      true,
    ],
    ['a refused payment', { kind: 'PAYMENT_FAILED', reason: 'Over the cap.' }, false, false],
  ])('after %s, re-reads the quote: %s, the bag: %s', (_label, refusal, quote, bag) => {
    expect(afterRefusal(refusal)).toEqual<PlacementFollowUp>({
      outcome: refusal,
      rereadQuote: quote,
      rereadBag: bag,
    });
  });
});

describe('afterFailure', () => {
  it('says "not placed" only for a refusal that was answered', () => {
    expect(afterFailure({ kind: 'NOT_PLACED' }, FAILED, WAIT)).toEqual<PlacementFollowUp>({
      outcome: { kind: 'PAYMENT_FAILED', reason: FAILED },
      rereadQuote: false,
      rereadBag: false,
    });
  });

  it('says to wait, and that nothing was placed, for a placement Java refused as one too many (F-09)', () => {
    expect(afterFailure({ kind: 'RATE_LIMITED' }, FAILED, WAIT)).toEqual<PlacementFollowUp>({
      outcome: { kind: 'PAYMENT_FAILED', reason: WAIT },
      rereadQuote: false,
      rereadBag: false,
    });
  });

  it('never says "not placed" when no answer came, and re-reads the bag an order empties', () => {
    expect(afterFailure({ kind: 'UNCONFIRMED' }, FAILED, WAIT)).toEqual<PlacementFollowUp>({
      outcome: { kind: 'UNCONFIRMED' },
      rereadQuote: false,
      rereadBag: true,
    });
  });
});
