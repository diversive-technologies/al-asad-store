import { describe, expect, it } from 'vitest';

import type { PieceId, ProductId, SizeId } from '@/lib/domain/ids';

import type { ProductDetailAvailability } from '../schemas/piece-availability.schema';
import type { Piece, ProductDetail } from '../schemas/product-detail.schema';
import {
  applyUnifiedSize,
  initialSelection,
  isSelectionComplete,
  setPieceSize,
  sizeStatus,
  unifiedSizeOf,
} from './size-selection';

const SMALL = 'size-s' as SizeId;
const MEDIUM = 'size-m' as SizeId;

function makePiece(id: string, sizeIds: readonly SizeId[]): Piece {
  return {
    // TS-12: ids are branded; fixtures brand directly rather than round-trip
    // through the schema, which is exercised at the API boundary instead.
    id: id as PieceId,
    code: `${id}-code`,
    name: id,
    position: 0,
    fabric: {
      id: 'fabric-1' as Piece['fabric']['id'],
      name: 'Lawn',
      weight: 'LIGHT',
      explainer: 'Fine and breathable.',
      careText: 'Machine wash cold.',
    },
    colour: { displayName: 'Ivory', description: 'Warm off-white.', hex: '#efe9dd' },
    sizes: sizeIds.map((sizeId) => ({ id: sizeId, label: sizeId })),
    lengthMetres: null,
  };
}

function makeProduct(type: 'SIMPLE' | 'SET', pieces: readonly Piece[]): ProductDetail {
  return {
    id: 'p1' as ProductId,
    code: 'AA-1000',
    slug: 'lawn-suit',
    name: 'Lawn suit',
    description: 'A lawn suit.',
    type,
    media: [{ url: '/placeholders/product-1.avif', alt: 'Lawn' }],
    pieces: [...pieces],
    pricing: { currentMinor: 349_900, originalMinor: null },
    isUnstitched: false,
    model: null,
    estimatedDeliveryDate: '2026-09-11',
    infoSections: [],
    fabricCalculator: null,
    isNew: false,
  };
}

const SIMPLE = makeProduct('SIMPLE', [makePiece('shirt', [SMALL, MEDIUM])]);
const SET = makeProduct('SET', [
  makePiece('shirt', [SMALL, MEDIUM]),
  makePiece('trouser', [SMALL, MEDIUM]),
  // A dupatta has no size set at all — a real state, not missing data.
  makePiece('dupatta', []),
]);

describe('initialSelection', () => {
  it('starts every piece unchosen, including one-size pieces', () => {
    expect(initialSelection(SET)).toEqual({ shirt: null, trouser: null, dupatta: null });
  });
});

describe('setPieceSize', () => {
  it('changes one piece and leaves the others alone', () => {
    const next = setPieceSize(initialSelection(SET), 'shirt' as PieceId, MEDIUM);
    expect(next).toEqual({ shirt: MEDIUM, trouser: null, dupatta: null });
  });
});

describe('applyUnifiedSize', () => {
  it('applies one size across every piece that offers it', () => {
    const next = applyUnifiedSize(SET, initialSelection(SET), MEDIUM);
    expect(next.shirt).toBe(MEDIUM);
    expect(next.trouser).toBe(MEDIUM);
  });

  it('leaves a one-size piece untouched', () => {
    // Forcing a size onto a piece with no size set would put an id in the map
    // that Inventory cannot key on.
    const next = applyUnifiedSize(SET, initialSelection(SET), MEDIUM);
    expect(next.dupatta).toBeNull();
  });

  it('overwrites an earlier per-piece override', () => {
    const overridden = setPieceSize(initialSelection(SET), 'trouser' as PieceId, SMALL);
    expect(applyUnifiedSize(SET, overridden, MEDIUM).trouser).toBe(MEDIUM);
  });
});

describe('unifiedSizeOf', () => {
  it('reports the shared size when every sizeable piece agrees', () => {
    expect(unifiedSizeOf(SET, applyUnifiedSize(SET, initialSelection(SET), MEDIUM))).toBe(MEDIUM);
  });

  it('reports nothing once one piece is overridden', () => {
    const mixed = setPieceSize(applyUnifiedSize(SET, initialSelection(SET), MEDIUM), 'trouser' as PieceId, SMALL);
    expect(unifiedSizeOf(SET, mixed)).toBeNull();
  });

  it('reports nothing while the selection is empty', () => {
    expect(unifiedSizeOf(SET, initialSelection(SET))).toBeNull();
  });

  it('reports nothing for a product with no sizeable piece', () => {
    const unstitched = makeProduct('SIMPLE', [makePiece('length', [])]);
    expect(unifiedSizeOf(unstitched, initialSelection(unstitched))).toBeNull();
  });
});

describe('isSelectionComplete', () => {
  it('is incomplete until every sizeable piece is chosen', () => {
    const partial = setPieceSize(initialSelection(SET), 'shirt' as PieceId, MEDIUM);
    expect(isSelectionComplete(SET, partial)).toBe(false);
  });

  it('is complete when the sizeable pieces are chosen, ignoring one-size pieces', () => {
    const chosen = applyUnifiedSize(SET, initialSelection(SET), MEDIUM);
    expect(isSelectionComplete(SET, chosen)).toBe(true);
  });

  it('is complete immediately for a product with no sizes at all', () => {
    const unstitched = makeProduct('SIMPLE', [makePiece('length', [])]);
    expect(isSelectionComplete(unstitched, initialSelection(unstitched))).toBe(true);
  });

  it('needs the one choice for a SIMPLE product', () => {
    expect(isSelectionComplete(SIMPLE, initialSelection(SIMPLE))).toBe(false);
    expect(
      isSelectionComplete(SIMPLE, setPieceSize(initialSelection(SIMPLE), 'shirt' as PieceId, SMALL)),
    ).toBe(true);
  });
});

describe('sizeStatus', () => {
  const availability: ProductDetailAvailability = {
    productId: 'p1' as ProductId,
    status: 'IN_STOCK',
    pieces: [
      {
        pieceId: 'shirt' as PieceId,
        status: 'IN_STOCK',
        sizes: [
          { sizeId: SMALL, status: 'SOLD_OUT' },
          { sizeId: MEDIUM, status: 'LOW_STOCK' },
        ],
      },
    ],
  };

  it('reports the status the backend gave', () => {
    expect(sizeStatus(availability, 'shirt' as PieceId, SMALL)).toBe('SOLD_OUT');
    expect(sizeStatus(availability, 'shirt' as PieceId, MEDIUM)).toBe('LOW_STOCK');
  });

  it('reports unknown rather than in-stock when the overlay is missing', () => {
    // Guessing "available" for an unknown size is exactly what DATA-13a forbids.
    expect(sizeStatus(null, 'shirt' as PieceId, SMALL)).toBeNull();
  });

  it('reports unknown for a piece the overlay did not cover', () => {
    expect(sizeStatus(availability, 'trouser' as PieceId, SMALL)).toBeNull();
  });
});

describe('availability-aware selection', () => {
  // The trouser's small is gone; the shirt's is not.
  const isSelectable = (pieceId: PieceId, sizeId: SizeId): boolean =>
    !(pieceId === ('trouser' as PieceId) && sizeId === SMALL);

  it('skips a piece whose unified size is sold out', () => {
    const next = applyUnifiedSize(SET, initialSelection(SET), SMALL, isSelectable);

    expect(next.shirt).toBe(SMALL);
    // Assigning it anyway would put an unbuyable pair in the selection and lead
    // to a reservation Inventory would refuse (§7.1).
    expect(next.trouser).toBeNull();
  });

  it('reports the selection incomplete when a piece was skipped', () => {
    const next = applyUnifiedSize(SET, initialSelection(SET), SMALL, isSelectable);
    expect(isSelectionComplete(SET, next, isSelectable)).toBe(false);
  });

  it('completes once the skipped piece is given an available size', () => {
    const next = setPieceSize(
      applyUnifiedSize(SET, initialSelection(SET), SMALL, isSelectable),
      'trouser' as PieceId,
      MEDIUM,
    );

    expect(isSelectionComplete(SET, next, isSelectable)).toBe(true);
  });

  it('rejects a previously chosen size that has since sold out', () => {
    const stale = applyUnifiedSize(SET, initialSelection(SET), SMALL);
    expect(isSelectionComplete(SET, stale)).toBe(true);
    expect(isSelectionComplete(SET, stale, isSelectable)).toBe(false);
  });

  it('treats every pair as selectable when no predicate is given', () => {
    // §30.2: a degraded overlay must not refuse every size.
    const next = applyUnifiedSize(SET, initialSelection(SET), SMALL);
    expect(next.trouser).toBe(SMALL);
  });
});
