import { describe, expect, it } from 'vitest';

import {
  pieceIdSchema,
  productIdSchema,
  sizeIdSchema,
  type PieceId,
  type SizeId,
} from '@/lib/domain/ids';

import type { AvailabilityStatus } from '../schemas/availability.schema';
import type { ProductDetailAvailability } from '../schemas/piece-availability.schema';
import { prefilledSelection } from './saved-size-prefill';
import {
  sharedSizesOf,
  sizeStatus,
  soldOutSizes,
  unifiedSizeOf,
  unifiedSizeStatus,
  type SizedProduct,
} from './size-selection';

/**
 * §28.2's unified selector on a SET: one size applied to EVERY piece. What it
 * offers, what it calls sold out, what Notify Me is offered on and what the
 * saved size pre-fills have to agree with the one thing that decides — the §7.1
 * add, which reserves every piece or none. It used to judge a size from the
 * FIRST piece alone, so a set whose shalwar was gone in M offered M as buyable.
 */

const S = sizeIdSchema.parse('00000000-0000-4000-8000-000000000001');
const M = sizeIdSchema.parse('00000000-0000-4000-8000-000000000002');
const L = sizeIdSchema.parse('00000000-0000-4000-8000-000000000003');
const KAMEEZ = pieceIdSchema.parse('00000000-0000-4000-8000-0000000000a1');
const SHALWAR = pieceIdSchema.parse('00000000-0000-4000-8000-0000000000a2');
const DUPATTA = pieceIdSchema.parse('00000000-0000-4000-8000-0000000000a3');

function piece(id: PieceId, sizeIds: readonly SizeId[]): SizedProduct['pieces'][number] {
  return { id, sizes: sizeIds.map((sizeId) => ({ id: sizeId, label: sizeId })) };
}

/** A set whose shalwar is not made in L, with a dupatta that has no size at all. */
const SET: SizedProduct = {
  pieces: [piece(KAMEEZ, [S, M, L]), piece(SHALWAR, [S, M]), piece(DUPATTA, [])],
};

type Statuses = Partial<Record<PieceId, Partial<Record<SizeId, AvailabilityStatus>>>>;

/** The live overlay, with only the `(piece, size)` pairs named here reported. */
function overlay(statuses: Statuses): ProductDetailAvailability {
  return {
    productId: productIdSchema.parse('00000000-0000-4000-8000-0000000000f1'),
    status: 'IN_STOCK',
    pieces: SET.pieces.map((entry) => ({
      pieceId: entry.id,
      status: 'IN_STOCK',
      sizes: Object.entries(statuses[entry.id] ?? {}).flatMap(([sizeId, status]) =>
        status === undefined ? [] : [{ sizeId: sizeIdSchema.parse(sizeId), status }],
      ),
    })),
  };
}

/** M is gone in the SHALWAR only — the kameez, the piece listed first, still has it. */
const SHALWAR_M_GONE = overlay({
  [KAMEEZ]: { [S]: 'IN_STOCK', [M]: 'IN_STOCK', [L]: 'IN_STOCK' },
  [SHALWAR]: { [S]: 'IN_STOCK', [M]: 'SOLD_OUT' },
});

describe('the sizes a unified selector offers', () => {
  it('offers only the sizes every sized piece is made in, in the first piece’s order', () => {
    expect(sharedSizesOf(SET).map((size) => size.id)).toEqual([S, M]);
  });

  it('offers nothing when the pieces share no size, rather than a size one of them lacks', () => {
    const apart: SizedProduct = { pieces: [piece(KAMEEZ, [S, M]), piece(SHALWAR, [L])] };

    expect(sharedSizesOf(apart)).toEqual([]);
  });
});

describe('the status of a unified size', () => {
  it.each([
    ['sold out in any piece, even when the first piece has it', SHALWAR_M_GONE, M, 'SOLD_OUT'],
    [
      'low when any piece is low',
      overlay({ [KAMEEZ]: { [S]: 'IN_STOCK' }, [SHALWAR]: { [S]: 'LOW_STOCK' } }),
      S,
      'LOW_STOCK',
    ],
    [
      'in stock only when every piece is',
      overlay({ [KAMEEZ]: { [S]: 'IN_STOCK' }, [SHALWAR]: { [S]: 'IN_STOCK' } }),
      S,
      'IN_STOCK',
    ],
    [
      'unknown when a piece was not reported and none is sold out',
      overlay({ [KAMEEZ]: { [S]: 'IN_STOCK' } }),
      S,
      null,
    ],
    [
      'sold out when a piece is gone even though another was not reported',
      overlay({ [SHALWAR]: { [S]: 'SOLD_OUT' } }),
      S,
      'SOLD_OUT',
    ],
  ] as const)('is %s', (_label, availability, sizeId, expected) => {
    expect(unifiedSizeStatus(SET, availability, sizeId)).toBe(expected);
  });

  it('is unknown, never sold out, when the overlay could not be read (§30.2)', () => {
    expect(unifiedSizeStatus(SET, null, M)).toBeNull();
  });
});

describe('what the unified selector and the §7.1 add agree on', () => {
  const statusOf = (sizeId: SizeId) => unifiedSizeStatus(SET, SHALWAR_M_GONE, sizeId);

  it('offers Notify Me on a size gone in any piece, which the first piece alone hid', () => {
    expect(soldOutSizes(sharedSizesOf(SET), statusOf).map((size) => size.id)).toEqual([M]);
  });

  it('never shows a pre-filled saved size as the set’s size when one piece cannot have it', () => {
    const prefilled = prefilledSelection(SET, [M], (pieceId, sizeId) =>
      sizeStatus(SHALWAR_M_GONE, pieceId, sizeId),
    );

    // The shalwar's M is not chosen for it, so the set has no one size — and
    // the size the selector would have drawn chosen is the one it marks sold out.
    expect(prefilled[SHALWAR]).toBeNull();
    expect(unifiedSizeOf(SET, prefilled)).toBeNull();
    expect(statusOf(M)).toBe('SOLD_OUT');
  });

  it('shows the pre-filled size as the set’s size when every piece can have it', () => {
    const prefilled = prefilledSelection(SET, [S], (pieceId, sizeId) =>
      sizeStatus(SHALWAR_M_GONE, pieceId, sizeId),
    );

    expect(unifiedSizeOf(SET, prefilled)).toBe(S);
    expect(statusOf(S)).toBe('IN_STOCK');
  });
});
