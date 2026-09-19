import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { addItem, cartHistory, createCart, resetCarts, summaryFor } from './bag-db';
import { resetReservations } from './bag-reservations';
import { CATALOGUE, type CatalogueRecord } from './catalogue-db';
import { placeOrder, quoteFor, resetOrders, type PlaceInput } from './checkout-db';
import { HOLD_PERIOD_MS } from './reservation-ledger';
import { availableKeys } from './stock-test-support';

/**
 * §7.2 step 1 — "verify every reservation is still active. If any has expired,
 * ROLLBACK and return the customer to the bag naming the expired items."
 *
 * BUG-07: the bag summary marked a lapsed line EXPIRED and dropped it whenever
 * anything READ the bag, and placement asked the summary. So by the time step 1
 * looked, the line was already gone: an all-lapsed bag answered "we could not
 * place your order" and a mixed one "the total has changed", and "some items are
 * no longer held" never appeared.
 */

const START = Date.parse('2026-09-17T09:00:00.000Z');
const MINUTE = 60 * 1000;

/** Products sold by size with a size in stock for every piece, in catalogue order. */
const ADDABLE: readonly CatalogueRecord[] = CATALOGUE.filter((record) => {
  const stockedPieces = new Set(availableKeys(record).map((key) => key.pieceId));
  return record.garmentType === 'stitched' && stockedPieces.size === record.pieceCount;
});

function at<T>(items: readonly T[], index: number): T {
  const value = items[index];
  if (value === undefined) throw new Error(`Expected an element at index ${String(index)}.`);
  return value;
}

/** Adds one of a product in its first stocked size for every piece. */
function addOne(cartId: string, record: CatalogueRecord, quantity = 1): void {
  const bySize = new Map(availableKeys(record).map((key) => [key.pieceId, key.sizeId]));
  const selections = [...bySize.entries()].map(([pieceId, sizeId]) => ({ pieceId, sizeId }));
  const outcome = addItem(cartId, record.id, selections, quantity, 'en');
  if (outcome.kind !== 'ADDED') throw new Error(`Expected ${record.code} to be addable.`);
}

/** What the checkout page holds after it last asked for a quote. */
function quotedInput(cartId: string): PlaceInput {
  const quote = quoteFor(cartId, 'en', 'standard', false);
  if (quote === null) throw new Error('Expected a quote.');

  return {
    contactName: 'Test Customer',
    contactMobile: '03001234567',
    contactEmail: '',
    addressLine: '12 Example Street, Block A',
    addressCity: 'Lahore',
    deliveryOptionId: 'standard',
    paymentMethodId: 'card',
    isGift: false,
    giftMessage: '',
    expectedTotalMinor: quote.totals.totalMinor,
  };
}

function nameOf(cartId: string, index: number): string {
  return at(summaryFor(cartId, 'en')?.lines ?? [], index).name;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(START);
  resetCarts();
  resetReservations();
  resetOrders();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('§7.2 step 1 — a hold that lapsed before payment', () => {
  it('is named, even when the checkout page read the bag after it lapsed', () => {
    const cartId = createCart();
    addOne(cartId, at(ADDABLE, 0));
    const name = nameOf(cartId, 0);
    const input = quotedInput(cartId);

    vi.setSystemTime(START + HOLD_PERIOD_MS + MINUTE);
    // The checkout page asking again — the read that used to take the line away.
    quoteFor(cartId, 'en', 'standard', true);

    expect(placeOrder(cartId, input, 'en')).toEqual({
      kind: 'RESERVATION_EXPIRED',
      expiredItems: [name],
    });
  });

  it('names only the lapsed line when another is still held, rather than a changed total', () => {
    const cartId = createCart();
    addOne(cartId, at(ADDABLE, 0));
    vi.setSystemTime(START + 20 * MINUTE);
    addOne(cartId, at(ADDABLE, 1));
    const lapsing = nameOf(cartId, 0);
    const input = quotedInput(cartId);

    vi.setSystemTime(START + HOLD_PERIOD_MS + 5 * MINUTE);

    expect(placeOrder(cartId, input, 'en')).toEqual({
      kind: 'RESERVATION_EXPIRED',
      expiredItems: [lapsing],
    });
  });

  it('records the lapse, so the next attempt goes on with what is still held', () => {
    const cartId = createCart();
    addOne(cartId, at(ADDABLE, 0));
    vi.setSystemTime(START + 20 * MINUTE);
    addOne(cartId, at(ADDABLE, 1));
    vi.setSystemTime(START + HOLD_PERIOD_MS + 5 * MINUTE);

    placeOrder(cartId, quotedInput(cartId), 'en');
    const second = placeOrder(cartId, quotedInput(cartId), 'en');

    expect(second.kind).toBe('PLACED');
    expect(second.kind === 'PLACED' ? second.order.lines : []).toHaveLength(1);
    expect(cartHistory(cartId)?.lines.map((line) => line.removalReason)).toEqual(['EXPIRED', null]);
  });

  it('re-adding a product whose hold lapsed starts a new line of what was asked for', () => {
    const cartId = createCart();
    const record = at(ADDABLE, 0);
    addOne(cartId, record, 2);

    vi.setSystemTime(START + HOLD_PERIOD_MS + MINUTE);
    addOne(cartId, record, 1);

    expect(summaryFor(cartId, 'en')?.lines.map((line) => line.quantity)).toEqual([1]);
    expect(cartHistory(cartId)?.lines.map((line) => line.removalReason)).toEqual(['EXPIRED', null]);
  });

  it('a read never records anything', () => {
    const cartId = createCart();
    addOne(cartId, at(ADDABLE, 0));
    vi.setSystemTime(START + HOLD_PERIOD_MS + MINUTE);

    expect(summaryFor(cartId, 'en')?.lines).toEqual([]);
    expect(cartHistory(cartId)?.lines.map((line) => line.removalReason)).toEqual([null]);
  });
});
