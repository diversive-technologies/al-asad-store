import { beforeEach, describe, expect, it } from 'vitest';

import { addItem, createCart, resetCarts } from './bag-db';
import {
  allocate,
  allocatedQuantity,
  reservedQuantity,
  resetReservations,
} from './bag-reservations';
import { CATALOGUE } from './catalogue-db';
import { placeOrder, quoteFor, resetOrders } from './checkout-db';
import { onHandFor } from './inventory-db';
import { toProductDetail } from './product-detail-db';
import { RESERVATIONS } from './reservation-ledger';

/**
 * TEST-08 — §7.1/§7.2's `allocated <= on_hand`, when ONE cart holds a
 * `(piece, size)` on TWO lines.
 *
 * A set bought in M for every piece, and the same set again with only the kameez
 * in L, are two lines sharing the waistcoat in M. The reservation used to set the
 * whole CART's holds aside when checking a line, so each line was checked as if
 * the other held nothing: eight waistcoats on the shelf, ten in one bag, and ten
 * allocated at placement — oversold by two, and read as −2 by everyone else.
 */

type Pick = { pieceId: string; sizeId: string };

interface SharedKey {
  productId: string;
  /** The first line: a size for every piece. */
  first: Pick[];
  /** The second line: the same, but ONE other piece in a different size. */
  second: Pick[];
  /** The key the two lines share, and the one the first line empties. */
  shared: Pick;
}

/** A SET with a piece in two stocked sizes, and a shared key that is the scarcest. */
function sharedKey(): SharedKey {
  for (const record of CATALOGUE) {
    if (record.type !== 'SET' || record.garmentType === 'unstitched') continue;
    const pieces = toProductDetail(record, 'en').pieces;
    const stocked = pieces.map((piece) =>
      piece.sizes.filter((size) => onHandFor(piece.id, size.id) > 0),
    );
    const varying = stocked.findIndex((sizes) => sizes.length >= 2);
    if (varying < 0 || stocked.some((sizes) => sizes.length === 0)) continue;

    const first = pieces.map((piece, index) => ({
      pieceId: piece.id,
      sizeId: stocked[index]?.[0]?.id ?? '',
    }));
    const second = first.map((pick, index) =>
      index === varying ? { ...pick, sizeId: stocked[index]?.[1]?.id ?? '' } : pick,
    );
    // The shared key must be the first line's scarcest, so the first line can empty it.
    const shared = first
      .filter((_pick, index) => index !== varying)
      .sort((a, b) => onHandFor(a.pieceId, a.sizeId) - onHandFor(b.pieceId, b.sizeId))[0];
    const capacity = Math.min(...first.map((pick) => onHandFor(pick.pieceId, pick.sizeId)));
    if (shared === undefined || capacity < 2) continue;
    if (onHandFor(shared.pieceId, shared.sizeId) !== capacity) continue;

    return { productId: record.id, first, second, shared };
  }
  throw new Error('No SET in the fixture has a piece stocked in two sizes.');
}

/** A hold written straight to the ledger, as any writer of the table could. */
function holdRow(lineId: string, key: Pick, quantity: number): void {
  RESERVATIONS.push({
    cartId: 'cart-a',
    lineId,
    ...key,
    quantity,
    expiresAt: Date.now() + 60_000,
    status: 'ACTIVE',
    settledAt: null,
  });
}

beforeEach(() => {
  resetCarts();
  resetReservations();
  resetOrders();
});

describe('two lines of one cart on the same (piece, size)', () => {
  it('refuses the second line the units the first already holds', () => {
    const { productId, first, second, shared } = sharedKey();
    const cart = createCart();
    const onHand = onHandFor(shared.pieceId, shared.sizeId);

    expect(addItem(cart, productId, first, onHand, 'en').kind).toBe('ADDED');
    expect(addItem(cart, productId, second, 1, 'en').kind).toBe('UNAVAILABLE');

    expect(reservedQuantity(shared.pieceId, shared.sizeId)).toBe(onHand);
  });

  it('still takes a second line the shelf can cover', () => {
    const { productId, first, second, shared } = sharedKey();
    const cart = createCart();
    const onHand = onHandFor(shared.pieceId, shared.sizeId);

    expect(addItem(cart, productId, first, onHand - 1, 'en').kind).toBe('ADDED');
    expect(addItem(cart, productId, second, 1, 'en').kind).toBe('ADDED');

    expect(reservedQuantity(shared.pieceId, shared.sizeId)).toBe(onHand);
  });

  it('never allocates more than is on hand at placement', () => {
    const { productId, first, second, shared } = sharedKey();
    const cart = createCart();
    const onHand = onHandFor(shared.pieceId, shared.sizeId);
    addItem(cart, productId, first, onHand, 'en');
    addItem(cart, productId, second, 1, 'en');

    const quote = quoteFor(cart, 'en', null, false);
    const outcome = placeOrder(
      cart,
      {
        contactName: 'Test Customer',
        contactMobile: '03001234567',
        contactEmail: '',
        addressLine: '12 Example Street, Block A',
        addressCity: 'Lahore',
        deliveryOptionId: quote?.deliveryOptionId ?? '',
        paymentMethodId: 'card',
        isGift: false,
        giftMessage: '',
        expectedTotalMinor: quote?.totals.totalMinor ?? 0,
      },
      'en',
    );

    expect(outcome.kind).toBe('PLACED');
    expect(allocatedQuantity(shared.pieceId, shared.sizeId)).toBeLessThanOrEqual(onHand);
  });
});

describe('§7.2 step 4 — the final guard is per KEY', () => {
  it('refuses, and writes nothing, when two of a cart’s rows together pass the shelf', () => {
    /*
     * No public write reaches this state any more — the reservation refuses the
     * second line — which is exactly why the final guard must be right on its
     * own: `allocated <= on_hand` is the constraint that holds whatever wrote the
     * rows. Each row alone fits; together they do not.
     */
    const { shared } = sharedKey();
    holdRow('line-a', shared, onHandFor(shared.pieceId, shared.sizeId));
    holdRow('line-b', shared, 1);

    expect(allocate('cart-a')).toBe(false);
    expect(allocatedQuantity(shared.pieceId, shared.sizeId)).toBe(0);
  });
});
