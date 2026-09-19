import { beforeEach, describe, expect, it } from 'vitest';

import { productAvailabilityFor } from './availability-db';
import { addItem, createCart, resetCarts, summaryFor } from './bag-db';
import { resetReservations } from './bag-reservations';
import { resolveSelections } from './bag-selection';
import { CATALOGUE, type CatalogueRecord } from './catalogue-db';
import { placeOrder, quoteFor, resetOrders } from './checkout-db';
import { ONE_SIZE } from './product-content-db';
import { toProductDetail } from './product-detail-db';
import { addItemBody } from './request-bodies';
import { takeEveryUnitOf } from './stock-test-support';

/**
 * BUG-01 — a one-piece unstitched length could not be bought at all.
 *
 * Its piece has no size set (§6.1, `size_set_id` null), so the buy box had no
 * size to send and sent an empty id the contract refused; and there was no stock
 * row keyed on it to reserve had it got through. §7.1's first step has the
 * backend resolve every piece's key, so the add names no size for that piece and
 * the cart keys it on the piece's one size.
 */

function unstitchedLength(): CatalogueRecord {
  const record = CATALOGUE.find(
    (entry) =>
      entry.garmentType === 'unstitched' &&
      entry.type === 'SIMPLE' &&
      productAvailabilityFor(entry.id, 'en')?.status !== 'SOLD_OUT',
  );
  if (record === undefined) throw new Error('The fixture has no unstitched length in stock.');
  return record;
}

beforeEach(() => {
  resetCarts();
  resetReservations();
  resetOrders();
});

describe('a product with no size to choose', () => {
  it('shows no size set on the product, which is why nothing can be chosen', () => {
    const detail = toProductDetail(unstitchedLength(), 'en');

    expect(detail.pieces.every((piece) => piece.sizes.length === 0)).toBe(true);
  });

  it('is added naming no size, and the line names its one size', () => {
    const record = unstitchedLength();
    const cart = createCart();
    const body = addItemBody.parse({ productId: record.id, selections: [], quantity: 1 });

    const result = addItem(cart, body.productId, body.selections, body.quantity, 'en');

    expect(result.kind).toBe('ADDED');
    const [line] = summaryFor(cart, 'en')?.lines ?? [];
    expect(line?.productId).toBe(record.id);
    expect(line?.pieces.map((piece) => piece.sizeLabel)).toEqual([ONE_SIZE.label.en]);
    expect(line?.reservationExpiresAt).not.toBeNull();
  });

  it('refuses a size named for a piece that has none', () => {
    const record = unstitchedLength();
    const [piece] = toProductDetail(record, 'en').pieces;
    const named = [{ pieceId: piece?.id ?? '', sizeId: ONE_SIZE.id }];

    expect(addItem(createCart(), record.id, named, 1, 'en').kind).toBe('SELECTION_REFUSED');
  });

  it('holds real stock: once every length is held, the product reads sold out', () => {
    const record = unstitchedLength();

    takeEveryUnitOf(record);

    expect(productAvailabilityFor(record.id, 'en')?.status).toBe('SOLD_OUT');
    const refused = addItem(createCart(), record.id, [], 1, 'en');
    expect(refused.kind).toBe('UNAVAILABLE');
    expect(refused.kind === 'UNAVAILABLE' ? refused.sizeLabel : '').toBe(ONE_SIZE.label.en);
  });

  it('places as an order like any other line', () => {
    const cart = createCart();
    addItem(cart, unstitchedLength().id, [], 1, 'en');
    const quote = quoteFor(cart, 'en', 'standard', false);

    const placed = placeOrder(
      cart,
      {
        contactName: 'Test Customer',
        contactMobile: '03001234567',
        contactEmail: '',
        addressLine: '12 Example Street, Block A',
        addressCity: 'Lahore',
        deliveryOptionId: 'standard',
        paymentMethodId: 'card',
        isGift: false,
        giftMessage: '',
        expectedTotalMinor: quote?.totals.totalMinor ?? -1,
      },
      'en',
    );

    expect(placed.kind).toBe('PLACED');
  });
});

describe('resolveSelections', () => {
  it('keys a sized SET on the sizes chosen, and refuses a cover missing a piece', () => {
    const record = CATALOGUE.find((entry) => entry.type === 'SET');
    const detail = record === undefined ? null : toProductDetail(record, 'en');
    if (detail === null) throw new Error('The fixture has no SET.');

    const chosen = detail.pieces.map((piece) => ({
      pieceId: piece.id,
      sizeId: piece.sizes[0]?.id ?? '',
    }));

    expect(resolveSelections(detail, chosen)).toEqual(chosen);
    expect(resolveSelections(detail, chosen.slice(1))).toBeNull();
  });
});
