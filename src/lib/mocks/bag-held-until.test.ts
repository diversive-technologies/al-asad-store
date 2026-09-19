import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { addItem, createCart, resetCarts, summaryFor, updateQuantity } from './bag-db';
import { resetReservations } from './bag-reservations';
import { CATALOGUE } from './catalogue-db';
import { onHandFor } from './inventory-db';
import { toProductDetail } from './product-detail-db';

/**
 * TEST-08 — §7.3: the bag states when its FIRST hold lapses.
 *
 * Each line is held from when it was last added to or changed, so a bag's lines
 * run on different clocks. The panel used to show the first line in the list's
 * time, so after the customer changed that line it named 10:50 while the other
 * line left the bag at 10:35.
 */

const MINUTE = 60 * 1000;
const START = new Date('2026-09-19T10:00:00.000Z');

interface Stocked {
  productId: string;
  selections: { pieceId: string; sizeId: string }[];
}

/** Two in-stock products sold by size, each as a full size cover. */
function twoProducts(): [Stocked, Stocked] {
  const found = CATALOGUE.flatMap((record) => {
    if (record.garmentType === 'unstitched') return [];
    const pieces = toProductDetail(record, 'en').pieces;
    const selections = pieces.flatMap((piece) => {
      const size = piece.sizes.find((entry) => onHandFor(piece.id, entry.id) >= 2);
      return size === undefined ? [] : [{ pieceId: piece.id, sizeId: size.id }];
    });
    return selections.length === pieces.length && pieces.length > 0
      ? [{ productId: record.id, selections }]
      : [];
  });
  const [first, second] = found;
  if (first === undefined || second === undefined) {
    throw new Error('Need two stocked products in the fixture.');
  }
  return [first, second];
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
  resetCarts();
  resetReservations();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the bag’s own hold time', () => {
  it('is the EARLIEST hold, not the first line’s', () => {
    const [first, second] = twoProducts();
    const cart = createCart();

    addItem(cart, first.productId, first.selections, 1, 'en');
    vi.setSystemTime(new Date(START.getTime() + 5 * MINUTE));
    addItem(cart, second.productId, second.selections, 1, 'en');

    // Changing the FIRST line renews its hold, and only its hold (§7.1).
    vi.setSystemTime(new Date(START.getTime() + 20 * MINUTE));
    const lineId = summaryFor(cart, 'en')?.lines[0]?.id ?? '';
    updateQuantity(cart, lineId, 2, 'en');

    const summary = summaryFor(cart, 'en');
    const secondLine = summary?.lines.find((line) => line.productId === second.productId);

    expect(summary?.heldUntil).toBe(secondLine?.reservationExpiresAt);
    expect(summary?.heldUntil).toBe(new Date(START.getTime() + 35 * MINUTE).toISOString());
  });

  it('is null for a bag that holds nothing', () => {
    expect(summaryFor(createCart(), 'en')?.heldUntil).toBeNull();
  });
});
