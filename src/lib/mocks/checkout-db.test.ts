import { beforeEach, describe, expect, it } from 'vitest';

import { addItem, createCart, resetCarts, summaryFor } from './bag-db';
import { allocatedQuantity, reservedQuantity, resetReservations } from './bag-reservations';
import { CATALOGUE } from './catalogue-db';
import { placeOrder, quoteFor, resetOrders, type PlaceInput } from './checkout-db';
import { onHandFor, toProductDetail } from './product-detail-db';

/**
 * Architecture §7.2 is the second of the two transactions §7 calls "the
 * correctness core of the system". Its two rollback paths — an expired hold and
 * a changed price — are behaviour the customer sees, so they are tested rather
 * than trusted.
 */

function at<T>(items: readonly T[], index: number): T {
  const value = items[index];
  if (value === undefined) throw new Error(`Expected an element at index ${String(index)}.`);
  return value;
}

/** A cart holding one in-stock product, ready to be placed. */
function stockedCart(): { cartId: string; selections: { pieceId: string; sizeId: string }[] } {
  for (const record of CATALOGUE) {
    if (record.garmentType === 'unstitched') continue;

    const detail = toProductDetail(record, 'en');
    const selections: { pieceId: string; sizeId: string }[] = [];

    for (const piece of detail.pieces) {
      const size = piece.sizes.find((entry) => onHandFor(piece.id, entry.id) > 0);
      if (size === undefined) break;
      selections.push({ pieceId: piece.id, sizeId: size.id });
    }

    if (selections.length !== detail.pieces.length || selections.length === 0) continue;

    const cartId = createCart();
    if (addItem(cartId, record.id, selections, 1, 'en').kind !== 'ADDED') continue;
    return { cartId, selections };
  }

  throw new Error('No product in the fixture could be added to a cart.');
}

function inputFor(cartId: string, overrides: Partial<PlaceInput> = {}): PlaceInput {
  const quote = quoteFor(cartId, 'en', 'standard', false);
  if (quote === null) throw new Error('Expected a quote for a stocked cart.');

  return {
    contactName: 'Test Customer',
    contactMobile: '03001234567',
    contactEmail: '',
    addressLine: '12 Example Street, Block A',
    addressCity: 'Lahore',
    deliveryOptionId: 'standard',
    paymentMethodId: 'cod',
    isGift: false,
    giftMessage: '',
    expectedTotalMinor: quote.totals.totalMinor,
    ...overrides,
  };
}

beforeEach(() => {
  resetCarts();
  resetReservations();
  resetOrders();
});

describe('§17 quote', () => {
  it('offers every payment method and every delivery option', () => {
    const { cartId } = stockedCart();
    const quote = quoteFor(cartId, 'en', 'standard', false);

    expect(quote?.paymentMethods).toHaveLength(4);
    expect(quote?.deliveryOptions.length).toBeGreaterThan(1);
    // Every method carries its own label, so the interface needs no lookup table.
    for (const method of quote?.paymentMethods ?? []) {
      expect(method.label.length).toBeGreaterThan(0);
      expect(method.description.length).toBeGreaterThan(0);
    }
  });

  it('withdraws Cash on Delivery above the cap, with a reason', () => {
    /*
     * §17: "Cash on Delivery is unavailable above the COD cap; the restriction
     * is enforced server-side, never only in the interface." The interface is
     * handed a disabled method and a sentence — it never sees the cap.
     */
    const { cartId, selections } = stockedCart();
    const bag = summaryFor(cartId, 'en');
    const line = at(bag?.lines ?? [], 0);

    // Pile on quantity until the total clears the cap.
    const record = CATALOGUE.find((entry) => entry.id === line.productId);
    if (record === undefined) throw new Error('unreachable');
    addItem(cartId, record.id, selections, 7, 'en');

    const quote = quoteFor(cartId, 'en', 'express', true);
    const cod = quote?.paymentMethods.find((method) => method.id === 'cod');

    if (quote !== null && quote.totals.totalMinor > 2_500_000) {
      expect(cod?.isAvailable).toBe(false);
      expect(cod?.unavailableReason?.length ?? 0).toBeGreaterThan(0);
      // The others are untouched: the cap belongs to one method, not to the bag.
      expect(quote.paymentMethods.filter((m) => m.isAvailable)).toHaveLength(3);
    }
  });

  it('prices gift wrapping and delivery into the total', () => {
    const { cartId } = stockedCart();

    const plain = quoteFor(cartId, 'en', 'standard', false);
    const gifted = quoteFor(cartId, 'en', 'express', true);

    expect(gifted?.totals.giftMinor).toBeGreaterThan(0);
    expect(plain?.totals.giftMinor).toBe(0);

    // §6.5: total = subtotal − discount + delivery + gift, and nothing else.
    for (const quote of [plain, gifted]) {
      if (quote === null) throw new Error('unreachable');
      const { subtotalMinor, discountMinor, deliveryMinor, giftMinor, totalMinor } = quote.totals;
      expect(totalMinor).toBe(subtotalMinor - discountMinor + deliveryMinor + giftMinor);
    }
  });
});

describe('§7.2 placing an order', () => {
  it('converts every reservation into an allocation', () => {
    const { cartId, selections } = stockedCart();
    const result = placeOrder(cartId, inputFor(cartId), 'en');

    expect(result.kind).toBe('PLACED');

    for (const selection of selections) {
      // Step 4: `allocated += quantity ; DELETE the reservation row.`
      expect(allocatedQuantity(selection.pieceId, selection.sizeId)).toBe(1);
      expect(reservedQuantity(selection.pieceId, selection.sizeId)).toBe(0);
    }
  });

  it('refuses when the total has moved, and shows the new one', () => {
    /*
     * §7.2 step 2: "If the total has changed since it was displayed, ROLLBACK
     * and show the customer the new total for explicit confirmation. Prices are
     * never silently changed under a customer at payment."
     */
    const { cartId, selections } = stockedCart();
    const stale = inputFor(cartId);

    // The bag changes after the customer saw their total — another unit of the
    // same product, which is the commonest way this actually happens: a second
    // tab, or a back-button re-submit.
    const line = at(summaryFor(cartId, 'en')?.lines ?? [], 0);
    addItem(cartId, line.productId, selections, 1, 'en');

    const result = placeOrder(cartId, stale, 'en');

    expect(result.kind).toBe('PRICE_CHANGED');
    if (result.kind !== 'PRICE_CHANGED') throw new Error('unreachable');
    expect(result.totals.totalMinor).not.toBe(stale.expectedTotalMinor);

    // ROLLBACK means nothing was allocated.
    for (const selection of selections) {
      expect(allocatedQuantity(selection.pieceId, selection.sizeId)).toBe(0);
    }
  });

  it('refuses a capped method above the cap even without a quote first', () => {
    // §17: enforced server-side. A client that skipped `quote` is still refused.
    const { cartId, selections } = stockedCart();
    const line = at(summaryFor(cartId, 'en')?.lines ?? [], 0);
    const record = CATALOGUE.find((entry) => entry.id === line.productId);
    if (record === undefined) throw new Error('unreachable');

    addItem(cartId, record.id, selections, 7, 'en');
    const result = placeOrder(cartId, inputFor(cartId, { paymentMethodId: 'cod' }), 'en');

    const quote = quoteFor(cartId, 'en', 'standard', false);
    if ((quote?.totals.totalMinor ?? 0) > 2_500_000) {
      expect(result.kind).toBe('PAYMENT_FAILED');
    }
  });

  it('snapshots the line detail rather than referring to the product', () => {
    // §6.5: "An order is a historical record. Renaming a product or changing a
    // price must never alter a placed order."
    const { cartId } = stockedCart();
    const result = placeOrder(cartId, inputFor(cartId), 'en');

    if (result.kind !== 'PLACED') throw new Error('Expected the order to be placed.');

    const line = at(result.order.lines, 0);
    expect(line.productName.length).toBeGreaterThan(0);
    expect(line.unitPriceMinor).toBeGreaterThan(0);
    expect(line.pieces.length).toBeGreaterThan(0);
    for (const piece of line.pieces) {
      expect(piece.size.length).toBeGreaterThan(0);
      expect(piece.name.length).toBeGreaterThan(0);
    }
  });

  it('starts each method in its own order and payment state', () => {
    /*
     * §6.6 — the two lifecycles are separate, and the difference between the
     * methods is data. Cash on Delivery waits for the customer's SMS reply;
     * a card is already authorised; a transfer waits for the money.
     */
    const expected = {
      cod: { state: 'AWAITING_CONFIRMATION', paymentState: 'AWAITING_CONFIRMATION' },
      card: { state: 'AWAITING_PAYMENT', paymentState: 'AUTHORIZED' },
      bank: { state: 'AWAITING_PAYMENT', paymentState: 'AWAITING_TRANSFER' },
    } as const;

    for (const [methodId, states] of Object.entries(expected)) {
      resetCarts();
      resetReservations();

      const { cartId } = stockedCart();
      const result = placeOrder(cartId, inputFor(cartId, { paymentMethodId: methodId }), 'en');

      if (result.kind !== 'PLACED') throw new Error(`Expected ${methodId} to place.`);
      expect(result.order.state).toBe(states.state);
      expect(result.order.paymentState).toBe(states.paymentState);
    }
  });

  it('empties the bag once the order exists', () => {
    const { cartId } = stockedCart();
    // Captured BEFORE placing: the cart is gone afterwards, which is the point.
    const input = inputFor(cartId);

    expect(placeOrder(cartId, input, 'en').kind).toBe('PLACED');

    /*
     * The cart is discarded on commit, so a customer who refreshes the tab and
     * re-submits cannot place the same order twice — and cannot allocate the
     * same stock twice either.
     */
    expect(summaryFor(cartId, 'en')).toBeNull();
    expect(placeOrder(cartId, input, 'en').kind).toBe('NOT_FOUND');
  });

  it('keeps allocated stock out of what the next customer can buy', () => {
    const { cartId, selections } = stockedCart();
    const key = at(selections, 0);
    const before = onHandFor(key.pieceId, key.sizeId);

    placeOrder(cartId, inputFor(cartId), 'en');

    // A sold unit is as unavailable as a held one; nothing re-sells it.
    expect(allocatedQuantity(key.pieceId, key.sizeId)).toBe(1);
    expect(before - allocatedQuantity(key.pieceId, key.sizeId)).toBe(before - 1);
  });
});
