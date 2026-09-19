import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addItem,
  cartHistory,
  createCart,
  moveToWishlist,
  removeLine,
  resetCarts,
  summaryFor,
} from './bag-db';
import { reservationLedger, reservedQuantity, resetReservations } from './bag-reservations';
import { CATALOGUE } from './catalogue-db';
import { saveProfile, type ProfileOwnerRow } from './profiles-db';
import { toProductDetail } from './product-detail-db';
import { HOLD_PERIOD_MS } from './reservation-ledger';
import { availableKeys, stockedProduct } from './stock-test-support';
import { saveItem, savedHistoryFor, savedItemsFor } from './wishlist-db';

/**
 * §16 `moveToWishlist(cart, line)` — "not now" rather than "not this".
 *
 * What makes it one operation rather than a removal and a save is that neither
 * half can happen alone, so every test asserts BOTH places: the bag and the saved
 * items. And D6 holds for the half that leaves: the line stays on file with the
 * reason it left, and its hold is released rather than dropped.
 *
 * The saved items cannot be reset (D6 — the store has no way to forget a row), so
 * each test names its own account, which is the isolation it actually needs.
 */

const START = Date.parse('2026-09-17T09:00:00.000Z');
const MINUTE = 60 * 1000;

interface StockLine {
  readonly productId: string;
  readonly lineId: string;
  readonly selections: readonly { pieceId: string; sizeId: string }[];
}

/** A line picked off the shelf: a SET, in a stocked size for every piece. */
function addStockLine(cartId: string): StockLine {
  const record = stockedProduct('SET');
  const bySize = new Map(availableKeys(record).map((key) => [key.pieceId, key.sizeId]));
  const selections = [...bySize.entries()].map(([pieceId, sizeId]) => ({ pieceId, sizeId }));

  const outcome = addItem(cartId, record.id, selections, 1, 'en');
  const lines = outcome.kind === 'ADDED' ? outcome.summary.lines : [];
  const line = lines.find((entry) => entry.stitching === null);
  if (line === undefined) throw new Error(`Expected ${record.code} to be addable.`);
  return { productId: record.id, lineId: line.id, selections };
}

const OWNER: ProfileOwnerRow = { keptWith: 'ACCOUNT', key: 'cut-line@example.com' };

/** A kameez shalwar cut to a saved set of figures — every required one in range. */
function addCutLine(cartId: string): string {
  const saved = saveProfile(OWNER, {
    garmentStyle: 'KAMEEZ_SHALWAR',
    source: 'GARMENT_COPY',
    version: 1,
    entries: [
      { pointId: 'kameezLength', raw: '40', unit: 'IN' },
      { pointId: 'kameezSleeve', raw: '24', unit: 'IN' },
      { pointId: 'kameezShoulder', raw: '18', unit: 'IN' },
      { pointId: 'kameezNeck', raw: '15.5', unit: 'IN' },
      { pointId: 'kameezChest', raw: '21', unit: 'IN' },
      { pointId: 'kameezBottom', raw: '22', unit: 'IN' },
      { pointId: 'shalwarLength', raw: '40', unit: 'IN' },
      { pointId: 'shalwarPaincha', raw: '7.5', unit: 'IN' },
    ],
    preferences: [],
    acknowledgedFindings: [],
  });
  const product = CATALOGUE.find(
    (entry) => toProductDetail(entry, 'en').stitching?.garmentStyle === 'KAMEEZ_SHALWAR',
  );
  if (saved.kind !== 'SAVED' || product === undefined) throw new Error('Expected a cut line.');

  const outcome = addItem(cartId, product.id, [], 1, 'en', saved.profile.id, OWNER);
  const lines = outcome.kind === 'ADDED' ? outcome.summary.lines : [];
  const line = lines.find((entry) => entry.stitching !== null);
  if (line === undefined) throw new Error('Expected the cut line to be added.');
  return line.id;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(START);
  resetCarts();
  resetReservations();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('§16 moveToWishlist', () => {
  it('saves the product and takes the line out of the bag, together', () => {
    const account = 'moves@example.com';
    const cartId = createCart();
    const { productId, lineId } = addStockLine(cartId);

    const result = moveToWishlist(cartId, lineId, account, 'en');

    expect(result.kind).toBe('MOVED');
    expect(result.kind === 'MOVED' ? result.summary.lines : null).toEqual([]);
    expect(savedItemsFor(account)).toEqual([productId]);
  });

  it('releases the hold at once, as a removal does, and keeps it on file', () => {
    const cartId = createCart();
    const { lineId, selections } = addStockLine(cartId);

    moveToWishlist(cartId, lineId, 'released@example.com', 'en');

    expect(selections.map((key) => reservedQuantity(key.pieceId, key.sizeId))).toEqual(
      selections.map(() => 0),
    );
    expect(reservationLedger(cartId).map((row) => row.status)).toEqual(
      selections.map(() => 'RELEASED'),
    );
  });

  it('keeps the line on file with its own reason, not as a plain removal (D6)', () => {
    const cartId = createCart();
    const { lineId } = addStockLine(cartId);

    moveToWishlist(cartId, lineId, 'reason@example.com', 'en');

    expect(cartHistory(cartId)?.lines.map((line) => line.removalReason)).toEqual([
      'MOVED_TO_WISHLIST',
    ]);
  });

  it('leaves a product that was already saved exactly where it was', () => {
    const account = 'already@example.com';
    const cartId = createCart();
    const { productId, lineId } = addStockLine(cartId);
    const earlier = CATALOGUE.find((entry) => entry.id !== productId)?.id ?? '';
    saveItem(account, productId);
    saveItem(account, earlier);

    moveToWishlist(cartId, lineId, account, 'en');

    expect(savedItemsFor(account)).toEqual([productId, earlier]);
    expect(savedHistoryFor(account)).toHaveLength(2);
  });

  it('saves the garment from a line whose hold lapsed, and records the lapse', () => {
    const account = 'lapsed@example.com';
    const cartId = createCart();
    const { productId, lineId } = addStockLine(cartId);
    vi.setSystemTime(START + HOLD_PERIOD_MS + MINUTE);

    const result = moveToWishlist(cartId, lineId, account, 'en');

    expect(result.kind).toBe('MOVED');
    expect(savedItemsFor(account)).toEqual([productId]);
    expect(cartHistory(cartId)?.lines.map((line) => line.removalReason)).toEqual(['EXPIRED']);
  });

  it('saves nothing for a line that has already left the bag', () => {
    const account = 'gone@example.com';
    const cartId = createCart();
    const { lineId } = addStockLine(cartId);
    removeLine(cartId, lineId, 'en');

    const result = moveToWishlist(cartId, lineId, account, 'en');

    expect(result.kind).toBe('NOT_IN_BAG');
    expect(savedItemsFor(account)).toEqual([]);
    expect(cartHistory(cartId)?.lines.map((line) => line.removalReason)).toEqual(['CUSTOMER']);
  });

  it('keeps a made-to-measure line in the bag, with its measurements', () => {
    const account = 'cut@example.com';
    const cartId = createCart();
    const lineId = addCutLine(cartId);

    const result = moveToWishlist(cartId, lineId, account, 'en');

    expect(result.kind).toBe('NOT_MOVABLE');
    expect(savedItemsFor(account)).toEqual([]);
    expect(summaryFor(cartId, 'en')?.lines.map((line) => line.id)).toEqual([lineId]);
  });

  it('states on each line whether it may move, so the interface never decides', () => {
    const cartId = createCart();
    const { lineId: stockLineId } = addStockLine(cartId);
    const cutLineId = addCutLine(cartId);

    const movable = new Map(
      summaryFor(cartId, 'en')?.lines.map((line) => [line.id, line.movableToWishlist]),
    );

    expect([movable.get(stockLineId), movable.get(cutLineId)]).toEqual([true, false]);
  });

  it('answers NOT_FOUND for a cart that is not a bag, and saves nothing', () => {
    const account = 'nocart@example.com';

    expect(moveToWishlist(crypto.randomUUID(), crypto.randomUUID(), account, 'en').kind).toBe(
      'NOT_FOUND',
    );
    expect(savedItemsFor(account)).toEqual([]);
  });
});
