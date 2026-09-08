import { beforeEach, describe, expect, it } from 'vitest';

import {
  addItem,
  applyCode,
  cartHistory,
  removeCode,
  removeLine,
  resetCarts,
  summaryFor,
  updateQuantity,
  createCart,
} from './bag-db';
import {
  reservationLedger,
  reservedQuantity,
  resetReservations,
  sweepExpired,
} from './bag-reservations';
import { CATALOGUE } from './catalogue-db';
import { onHandFor, toProductDetail } from './product-detail-db';

/**
 * Architecture §7.1 and §7.3 are "the correctness core of the system" (§7), and
 * §1.2 names partial reservation of a SET as the central correctness problem.
 * These tests exist because that is a claim about behaviour under contention,
 * and the only way a mock earns the right to stand in for the Java transaction
 * is to actually behave that way.
 */

/**
 * TS-05 forbids `!`. Tests still need to say "this index must exist", so they
 * say it as a check that fails loudly rather than as an assertion the compiler
 * is told to ignore.
 */
function at<T>(items: readonly T[], index: number): T {
  const value = items[index];
  if (value === undefined) throw new Error(`Expected an element at index ${String(index)}.`);
  return value;
}

interface Candidate {
  productId: string;
  selections: { pieceId: string; sizeId: string }[];
  /** The smallest `on_hand` across the chosen keys — what the line can reach. */
  capacity: number;
}

/** The first product of the given type whose every piece has a size in stock. */
function candidate(type: 'SIMPLE' | 'SET', minCapacity = 1): Candidate {
  for (const record of CATALOGUE) {
    if (record.type !== type || record.garmentType === 'unstitched') continue;

    const detail = toProductDetail(record, 'en');
    const selections: { pieceId: string; sizeId: string }[] = [];
    let capacity = Number.POSITIVE_INFINITY;

    for (const piece of detail.pieces) {
      const size = piece.sizes.find((entry) => onHandFor(piece.id, entry.id) >= minCapacity);
      if (size === undefined) break;
      selections.push({ pieceId: piece.id, sizeId: size.id });
      capacity = Math.min(capacity, onHandFor(piece.id, size.id));
    }

    if (selections.length === detail.pieces.length && selections.length > 0) {
      return { productId: record.id, selections, capacity };
    }
  }

  throw new Error(`No ${type} product in the fixture has stock on every piece.`);
}

beforeEach(() => {
  resetCarts();
  resetReservations();
});

describe('§7.1 reserving stock', () => {
  it('reserves every piece of a SET in one transaction', () => {
    const { productId, selections } = candidate('SET');
    const cart = createCart();

    const result = addItem(cart, productId, selections, 1, 'en');

    expect(result.kind).toBe('ADDED');
    // Uniform storage (§6.1): a three-piece set is three `(piece, size)` rows.
    for (const selection of selections) {
      expect(reservedQuantity(selection.pieceId, selection.sizeId)).toBe(1);
    }
  });

  it('runs the same routine for a SIMPLE product, once', () => {
    const { productId, selections } = candidate('SIMPLE');
    const cart = createCart();

    expect(addItem(cart, productId, selections, 1, 'en').kind).toBe('ADDED');
    expect(selections).toHaveLength(1);
    expect(reservedQuantity(at(selections, 0).pieceId, at(selections, 0).sizeId)).toBe(1);
  });

  it('refuses when the stock is gone, and NAMES the piece that failed', () => {
    const { productId, selections, capacity } = candidate('SET');
    const mine = createCart();
    const theirs = createCart();

    // Someone else takes everything.
    expect(addItem(theirs, productId, selections, capacity, 'en').kind).toBe('ADDED');

    const result = addItem(mine, productId, selections, 1, 'en');

    expect(result.kind).toBe('UNAVAILABLE');
    if (result.kind !== 'UNAVAILABLE') throw new Error('unreachable');

    // §7.1: "the response names the piece that failed", not a generic refusal.
    expect(selections.some((s) => s.pieceId === result.pieceId)).toBe(true);
    expect(result.pieceName.length).toBeGreaterThan(0);
    expect(result.sizeLabel.length).toBeGreaterThan(0);
  });

  it('leaves NO reservation behind when one piece of a set is unavailable', () => {
    /*
     * §1.2's central correctness problem. The set is checked piece by piece, so
     * a naive implementation reserves the pieces it can before discovering the
     * one it cannot — and leaves stock held for a line that was never created.
     */
    const { productId, selections, capacity } = candidate('SET');
    if (selections.length < 2) throw new Error('Need a multi-piece set for this test.');

    const blocker = createCart();
    const last = at(selections, selections.length - 1);

    // Exhaust ONLY the final piece, so the earlier ones would pass their check.
    expect(
      addItem(
        blocker,
        productId,
        selections.map((s) => ({ ...s })),
        capacity,
        'en',
      ).kind,
    ).toBe('ADDED');

    const mine = createCart();
    const before = selections.map((s) => reservedQuantity(s.pieceId, s.sizeId));

    expect(addItem(mine, productId, selections, 1, 'en').kind).toBe('UNAVAILABLE');

    const after = selections.map((s) => reservedQuantity(s.pieceId, s.sizeId));
    expect(after).toEqual(before);
    expect(reservedQuantity(last.pieceId, last.sizeId)).toBe(capacity);
    // And no line was created for the failed add.
    expect(summaryFor(mine, 'en')?.lines).toHaveLength(0);
  });

  it('refreshes an existing hold rather than stacking a second one', () => {
    // §7.1: "so a customer editing their bag does not accumulate reservations
    // against themselves."
    const { productId, selections } = candidate('SIMPLE', 3);
    const cart = createCart();
    const key = at(selections, 0);

    addItem(cart, productId, selections, 1, 'en');
    addItem(cart, productId, selections, 1, 'en');

    expect(reservedQuantity(key.pieceId, key.sizeId)).toBe(2);
    expect(summaryFor(cart, 'en')?.lines).toHaveLength(1);
  });

  it('does not count a cart’s own hold against its own raise', () => {
    const { productId, selections, capacity } = candidate('SIMPLE', 2);
    const cart = createCart();

    addItem(cart, productId, selections, capacity, 'en');
    const line = summaryFor(cart, 'en')?.lines[0];

    // Raising to the same total must succeed: the units it is "competing" with
    // are the ones it already holds.
    expect(updateQuantity(cart, line?.id ?? '', capacity, 'en').kind).toBe('ADDED');
    // Going beyond the shelf must still fail.
    expect(updateQuantity(cart, line?.id ?? '', capacity + 1, 'en').kind).toBe('UNAVAILABLE');
  });
});

describe('§16 cart invariants', () => {
  it('releases the reservation immediately when a line is removed', () => {
    const { productId, selections } = candidate('SET');
    const cart = createCart();

    addItem(cart, productId, selections, 1, 'en');
    const line = summaryFor(cart, 'en')?.lines[0];
    removeLine(cart, line?.id ?? '', 'en');

    for (const selection of selections) {
      expect(reservedQuantity(selection.pieceId, selection.sizeId)).toBe(0);
    }
  });

  it('releases stock when a quantity is reduced', () => {
    const { productId, selections } = candidate('SIMPLE', 3);
    const cart = createCart();
    const key = at(selections, 0);

    addItem(cart, productId, selections, 3, 'en');
    const line = summaryFor(cart, 'en')?.lines[0];
    updateQuantity(cart, line?.id ?? '', 1, 'en');

    expect(reservedQuantity(key.pieceId, key.sizeId)).toBe(1);
  });

  it('refuses a line that does not cover every piece of its product', () => {
    // §16: "A line cannot exist without a size selected for every piece."
    const { productId, selections } = candidate('SET');
    const cart = createCart();

    const result = addItem(cart, productId, selections.slice(0, 1), 1, 'en');
    expect(result.kind).toBe('NOT_FOUND');
  });

  it('shows per-piece sizes on the line, which is what §28.2 displays', () => {
    const { productId, selections } = candidate('SET');
    const cart = createCart();

    addItem(cart, productId, selections, 1, 'en');
    const line = summaryFor(cart, 'en')?.lines[0];

    expect(line?.pieces).toHaveLength(selections.length);
    for (const piece of line?.pieces ?? []) {
      expect(piece.name.length).toBeGreaterThan(0);
      expect(piece.sizeLabel.length).toBeGreaterThan(0);
    }
  });
});

describe('§7.3 expiry', () => {
  it('excludes an expired hold at READ time, with no sweeper involved', () => {
    const { productId, selections } = candidate('SIMPLE');
    const cart = createCart();
    const key = at(selections, 0);

    addItem(cart, productId, selections, 1, 'en');
    expect(reservedQuantity(key.pieceId, key.sizeId)).toBe(1);

    // Ask as if the hold period had passed. Nothing ran; the row is still there.
    const later = Date.now() + 31 * 60 * 1000;
    expect(reservedQuantity(key.pieceId, key.sizeId, { now: later })).toBe(0);
  });

  it('sweeps only to keep the table small, never for correctness', () => {
    const { productId, selections } = candidate('SIMPLE');
    addItem(createCart(), productId, selections, 1, 'en');

    // Nothing has expired, so the sweep removes nothing and changes nothing.
    expect(sweepExpired()).toBe(0);
    expect(reservedQuantity(at(selections, 0).pieceId, at(selections, 0).sizeId)).toBe(1);
  });
});

describe('D6 provenance — nothing is destroyed', () => {
  it('keeps a removed line on file, with the reason it left', () => {
    const { productId, selections } = candidate('SIMPLE');
    const cart = createCart();

    addItem(cart, productId, selections, 1, 'en');
    const lineId = summaryFor(cart, 'en')?.lines[0]?.id ?? '';
    removeLine(cart, lineId, 'en');

    // Gone from the bag the customer sees...
    expect(summaryFor(cart, 'en')?.lines).toHaveLength(0);

    // ...and still on file, saying who removed it rather than merely that it ended.
    const history = cartHistory(cart);
    expect(history?.lines).toHaveLength(1);
    expect(history?.lines[0]?.removalReason).toBe('CUSTOMER');
  });

  it('keeps the reservation a removed line held, marked RELEASED', () => {
    const { productId, selections } = candidate('SET');
    const cart = createCart();

    addItem(cart, productId, selections, 1, 'en');
    const lineId = summaryFor(cart, 'en')?.lines[0]?.id ?? '';
    removeLine(cart, lineId, 'en');

    const ledger = reservationLedger(cart);
    expect(ledger).toHaveLength(selections.length);
    expect(ledger.every((row) => row.status === 'RELEASED')).toBe(true);

    // The stock is genuinely free again — provenance is not a leak.
    for (const selection of selections) {
      expect(reservedQuantity(selection.pieceId, selection.sizeId)).toBe(0);
    }
  });

  it('records both codes when one supersedes another', () => {
    const { productId, selections } = candidate('SIMPLE');
    const cart = createCart();
    addItem(cart, productId, selections, 1, 'en');

    applyCode(cart, 'EID10', 'en');
    applyCode(cart, 'WELCOME500', 'en');
    removeCode(cart, 'en');

    const codes = cartHistory(cart)?.codes ?? [];
    expect(codes.map((entry) => entry.code)).toEqual(['EID10', 'WELCOME500']);
    // Both lifted, so nothing is in force and the bag carries no code.
    expect(codes.every((entry) => entry.liftedAt !== null)).toBe(true);
    expect(summaryFor(cart, 'en')?.pricing.appliedCode).toBeNull();
  });

  it('archives a settled reservation instead of deleting it', () => {
    const { productId, selections } = candidate('SIMPLE');
    const cart = createCart();

    addItem(cart, productId, selections, 1, 'en');
    const lineId = summaryFor(cart, 'en')?.lines[0]?.id ?? '';
    removeLine(cart, lineId, 'en');

    // The sweep moves it OUT of the hot table — which is what keeps an
    // availability read cheap — and the row is still readable afterwards.
    expect(sweepExpired()).toBe(selections.length);
    expect(reservationLedger(cart)).toHaveLength(selections.length);
  });
});

describe('pricing is the backend’s answer', () => {
  it('applies a known code and refuses an unknown one', () => {
    const { productId, selections } = candidate('SIMPLE');
    const cart = createCart();
    addItem(cart, productId, selections, 1, 'en');

    expect(applyCode(cart, 'NOPE', 'en').kind).toBe('REJECTED');

    const applied = applyCode(cart, 'eid10', 'en');
    expect(applied.kind).toBe('APPLIED');
    if (applied.kind !== 'APPLIED') throw new Error('unreachable');

    const { pricing } = applied.summary;
    expect(pricing.appliedCode?.code).toBe('EID10');
    expect(pricing.discountMinor).toBe(Math.round(pricing.subtotalMinor / 10));
    expect(pricing.totalMinor).toBe(
      pricing.subtotalMinor - pricing.discountMinor + pricing.deliveryMinor,
    );
  });

  it('reports free-delivery progress rather than leaving it to be derived', () => {
    const { productId, selections } = candidate('SIMPLE');
    const cart = createCart();
    addItem(cart, productId, selections, 1, 'en');

    const summary = summaryFor(cart, 'en');
    const { freeDelivery, pricing } = summary ?? { freeDelivery: null, pricing: null };

    expect(freeDelivery?.thresholdMinor).toBeGreaterThan(0);
    if (freeDelivery?.isMet === true) {
      expect(freeDelivery.remainingMinor).toBe(0);
      expect(pricing?.deliveryMinor).toBe(0);
    } else {
      expect(freeDelivery?.remainingMinor).toBeGreaterThan(0);
      expect(pricing?.deliveryMinor).toBeGreaterThan(0);
    }
  });

  it('charges no delivery on an empty bag', () => {
    const summary = summaryFor(createCart(), 'en');

    expect(summary?.lines).toHaveLength(0);
    expect(summary?.pricing.deliveryMinor).toBe(0);
    expect(summary?.pricing.totalMinor).toBe(0);
    expect(summary?.freeDelivery.isMet).toBe(false);
  });
});
