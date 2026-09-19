import { describe, expect, it } from 'vitest';

import { pieceIdSchema, sizeIdSchema, type PieceId, type SizeId } from '@/lib/domain/ids';

import type { AvailabilityStatus } from '../schemas/availability.schema';
import {
  chosenSizeOf,
  hasAnySize,
  prefilledSelection,
  savedSizeIn,
  type StatusOf,
} from './saved-size-prefill';
import { setPieceSize, type SizedProduct } from './size-selection';

/**
 * §28.3's "pre-filling the size selector": a saved size is chosen on a product
 * page where the product is made in it AND the overlay reported it in stock for
 * every piece made in it — a set takes its saved size whole or not at all — and
 * nowhere else.
 */

const S = sizeIdSchema.parse('00000000-0000-4000-8000-000000000001');
const M = sizeIdSchema.parse('00000000-0000-4000-8000-000000000002');
const W32 = sizeIdSchema.parse('00000000-0000-4000-8000-000000000032');
const KAMEEZ = pieceIdSchema.parse('00000000-0000-4000-8000-0000000000a1');
const SHALWAR = pieceIdSchema.parse('00000000-0000-4000-8000-0000000000a2');
const DUPATTA = pieceIdSchema.parse('00000000-0000-4000-8000-0000000000a3');

function piece(id: PieceId, sizeIds: readonly SizeId[]): SizedProduct['pieces'][number] {
  return { id, sizes: sizeIds.map((sizeId) => ({ id: sizeId, label: labelOf(sizeId) })) };
}

function labelOf(sizeId: SizeId): string {
  return (
    new Map([
      [S, 'S'],
      [M, 'M'],
      [W32, '32'],
    ]).get(sizeId) ?? '?'
  );
}

/** A set cut to one chart, with a sizeless dupatta. */
const SET: SizedProduct = {
  pieces: [piece(KAMEEZ, [S, M]), piece(SHALWAR, [S, M]), piece(DUPATTA, [])],
};

/** A set whose trouser is cut to a waist chart of its own. */
const TWO_CHARTS: SizedProduct = { pieces: [piece(KAMEEZ, [S, M]), piece(SHALWAR, [W32])] };

const everywhere =
  (status: AvailabilityStatus | null): StatusOf =>
  () =>
    status;

/** The shalwar's saved size has sold out; the kameez's has not. */
const shalwarGone: StatusOf = (pieceId) => (pieceId === SHALWAR ? 'SOLD_OUT' : 'IN_STOCK');

const CLOTHING_SIZES = piece(KAMEEZ, [S, M]).sizes;
const WAIST_SIZES = piece(SHALWAR, [W32]).sizes;

describe('savedSizeIn', () => {
  it('finds the saved size among a selector’s sizes', () => {
    expect(savedSizeIn(CLOTHING_SIZES, [W32, M])).toBe(M);
  });

  it('finds nothing when no saved size is one of them', () => {
    expect(savedSizeIn(WAIST_SIZES, [M])).toBeNull();
  });
});

describe('prefilledSelection', () => {
  it.each([
    ['in stock', 'IN_STOCK', M],
    ['low in stock', 'LOW_STOCK', M],
    ['sold out', 'SOLD_OUT', null],
    ['not known, because the overlay could not be read', null, null],
  ] as const)('chooses a saved size reported %s accordingly', (_label, status, expected) => {
    expect(prefilledSelection(SET, [M], everywhere(status))[KAMEEZ]).toBe(expected);
  });

  it('chooses nothing when the saved size is sold out on any one piece of the set', () => {
    // It used to choose the kameez's M and leave the shalwar blank: a set half-sized
    // in the customer's size, with Add to bag unavailable and a note saying their
    // size had been chosen.
    expect(prefilledSelection(SET, [M], shalwarGone)).toEqual({
      [KAMEEZ]: null,
      [SHALWAR]: null,
      [DUPATTA]: null,
    });
    expect(hasAnySize(prefilledSelection(SET, [M], shalwarGone))).toBe(false);
  });

  it('still chooses a piece whose chart has a saved size when another chart has none', () => {
    expect(prefilledSelection(TWO_CHARTS, [M], everywhere('IN_STOCK'))).toEqual({
      [KAMEEZ]: M,
      [SHALWAR]: null,
    });
  });

  it('gives each piece the saved size of its own chart', () => {
    expect(prefilledSelection(TWO_CHARTS, [M, W32], everywhere('IN_STOCK'))).toEqual({
      [KAMEEZ]: M,
      [SHALWAR]: W32,
    });
  });

  it('chooses nothing without saved sizes', () => {
    expect(hasAnySize(prefilledSelection(SET, [], everywhere('IN_STOCK')))).toBe(false);
  });
});

describe('chosenSizeOf', () => {
  it('names the one size a selection comes to, with its label', () => {
    const selection = prefilledSelection(SET, [M], everywhere('IN_STOCK'));

    expect(chosenSizeOf(SET, selection)).toEqual({ id: M, label: 'M' });
  });

  it('names nothing while the pieces are sized apart', () => {
    const apart = setPieceSize(prefilledSelection(SET, [M], everywhere('IN_STOCK')), SHALWAR, S);

    expect(chosenSizeOf(SET, apart)).toBeNull();
  });

  it('names nothing while nothing is chosen', () => {
    expect(chosenSizeOf(SET, prefilledSelection(SET, [], everywhere('IN_STOCK')))).toBeNull();
  });
});
