import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';
import { ur } from '@/i18n/messages/ur';
import type { PieceId, ProductId, SizeId } from '@/lib/domain/ids';
import { formatTemplate } from '@/lib/utils/format';

import type { ProductDetailAvailability } from '../schemas/piece-availability.schema';
import type { Piece, ProductDetail } from '../schemas/product-detail.schema';
import { quickAddSelections, unifiedSizesFor } from './quick-add';

const SMALL = 'size-s' as SizeId;
const MEDIUM = 'size-m' as SizeId;
const LARGE = 'size-l' as SizeId;

function piece(id: string, sizes: readonly SizeId[], lengthMetres: number | null = null): Piece {
  return {
    id: id as PieceId,
    code: `${id}-code`,
    name: id,
    position: 0,
    fabric: {
      id: 'fabric-1' as Piece['fabric']['id'],
      name: 'Cotton',
      weight: 'MEDIUM',
      explainer: 'Soft.',
      careText: 'Wash cold.',
    },
    colour: { displayName: 'Rust', description: 'Warm red-brown.', hex: '#a0522d' },
    sizes: sizes.map((sizeId) => ({ id: sizeId, label: sizeId })),
    lengthMetres,
  };
}

function product(type: 'SIMPLE' | 'SET', pieces: readonly Piece[]): ProductDetail {
  return {
    id: 'p1' as ProductId,
    code: 'AA-1011',
    slug: 'cotton-kurta-rust-12',
    name: 'Kurta',
    description: 'A length of cotton.',
    type,
    media: [{ url: '/products/kurta-rust.avif', alt: 'Rust kurta' }],
    pieces: [...pieces],
    pricing: { currentMinor: 349_900, originalMinor: null },
    isUnstitched: true,
    model: null,
    estimatedDeliveryDate: '2026-09-11',
    infoSections: [],
    fabricCalculator: null,
    stitching: null,
    isNew: false,
  };
}

function soldOut(productId: string): ProductDetailAvailability {
  return { productId: productId as ProductId, status: 'SOLD_OUT', pieces: [] };
}

type Status = ProductDetailAvailability['status'];

/** The overlay for a product, piece by piece and size by size, as the backend reports it. */
function overlay(
  pieces: Readonly<Record<string, Readonly<Record<string, Status>>>>,
  status: Status = 'IN_STOCK',
): ProductDetailAvailability {
  return {
    productId: 'p1' as ProductId,
    status,
    pieces: Object.entries(pieces).map(([pieceId, sizes]) => ({
      pieceId: pieceId as PieceId,
      status,
      sizes: Object.entries(sizes).map(([sizeId, sizeStatus]) => ({
        sizeId: sizeId as SizeId,
        status: sizeStatus,
      })),
    })),
  };
}

/*
 * BUG-01: the card's quick add on an unstitched length opened an EMPTY tray —
 * no sizes, and no other way to add — because there was no size to intersect.
 */
describe('a product with no size to choose', () => {
  const length = product('SIMPLE', [piece('kurta', [], 4.5)]);

  it('offers the add itself rather than an empty list of sizes', () => {
    expect(unifiedSizesFor(length, null)).toEqual({ kind: 'ONE_SIZE', isAvailable: true });
  });

  it('says so when the backend reports it sold out', () => {
    expect(unifiedSizesFor(length, soldOut(length.id))).toEqual({
      kind: 'ONE_SIZE',
      isAvailable: false,
    });
  });

  it.each(['IN_STOCK', 'LOW_STOCK'] as const)(
    'can be bought while the backend reports %s',
    (status) => {
      expect(unifiedSizesFor(length, overlay({}, status))).toEqual({
        kind: 'ONE_SIZE',
        isAvailable: true,
      });
    },
  );

  it('sends no size for it, which is what the cart resolves', () => {
    expect(quickAddSelections(unifiedSizesFor(length, null), null)).toEqual([]);
  });
});

/*
 * The operator's rule: a card sells the product as ONE entity, so what it may
 * offer is the INTERSECTION of the pieces' sizes — a size one piece lacks is an
 * add the §7.1 transaction would refuse.
 */
describe('a product with sizes', () => {
  const set = product('SET', [
    piece('kameez', [SMALL, MEDIUM]),
    piece('shalwar', [MEDIUM]),
    piece('dupatta', []),
  ]);

  it('offers the sizes every sized piece shares, applied to the sized pieces only', () => {
    const offer = unifiedSizesFor(set, null);

    expect(offer).toEqual({
      kind: 'SIZED',
      pieceIds: ['kameez', 'shalwar'],
      sizes: [{ id: MEDIUM, label: MEDIUM, isAvailable: true }],
    });
    expect(quickAddSelections(offer, MEDIUM)).toEqual([
      { pieceId: 'kameez', sizeId: MEDIUM },
      { pieceId: 'shalwar', sizeId: MEDIUM },
    ]);
  });

  it('lists the shared sizes in the order the first sized piece lists them', () => {
    const suit = product('SET', [
      piece('waistcoat', [LARGE, SMALL, MEDIUM]),
      piece('kameez', [MEDIUM, SMALL, LARGE]),
    ]);

    expect(unifiedSizesFor(suit, null)).toMatchObject({
      sizes: [{ id: LARGE }, { id: SMALL }, { id: MEDIUM }],
    });
  });

  it('offers nothing to choose when no size is made in every piece', () => {
    const apart = product('SET', [piece('kameez', [SMALL]), piece('shalwar', [MEDIUM])]);

    expect(unifiedSizesFor(apart, null)).toEqual({
      kind: 'SIZED',
      pieceIds: ['kameez', 'shalwar'],
      sizes: [],
    });
  });

  it('sends no size until one is chosen', () => {
    expect(quickAddSelections(unifiedSizesFor(set, null), null)).toEqual([]);
  });
});

describe('whether a shared size can be bought', () => {
  const suit = product('SET', [
    piece('kameez', [SMALL, MEDIUM, LARGE]),
    piece('shalwar', [SMALL, MEDIUM, LARGE]),
  ]);

  it('is sold out when ANY piece is sold out in it, since the set cannot be reserved', () => {
    const offer = unifiedSizesFor(
      suit,
      overlay({
        kameez: { [SMALL]: 'IN_STOCK', [MEDIUM]: 'IN_STOCK', [LARGE]: 'LOW_STOCK' },
        shalwar: { [SMALL]: 'IN_STOCK', [MEDIUM]: 'SOLD_OUT', [LARGE]: 'LOW_STOCK' },
      }),
    );

    expect(offer).toMatchObject({
      sizes: [
        { id: SMALL, isAvailable: true },
        { id: MEDIUM, isAvailable: false },
        { id: LARGE, isAvailable: true },
      ],
    });
  });

  it.each([
    ['the overlay could not be read', null],
    ['the overlay does not mention the piece', overlay({ kameez: { [MEDIUM]: 'IN_STOCK' } })],
    ['the overlay does not mention the size', overlay({ kameez: {}, shalwar: {} })],
  ])('stays offerable when %s — unknown is not sold out (§30.2)', (_label, availability) => {
    expect(unifiedSizesFor(suit, availability)).toMatchObject({
      sizes: [
        { id: SMALL, isAvailable: true },
        { id: MEDIUM, isAvailable: true },
        { id: LARGE, isAvailable: true },
      ],
    });
  });

  it('follows the size, not the product-level status the overlay also carries', () => {
    const offer = unifiedSizesFor(
      suit,
      overlay(
        {
          kameez: { [SMALL]: 'SOLD_OUT', [MEDIUM]: 'IN_STOCK', [LARGE]: 'SOLD_OUT' },
          shalwar: { [SMALL]: 'SOLD_OUT', [MEDIUM]: 'IN_STOCK', [LARGE]: 'SOLD_OUT' },
        },
        'LOW_STOCK',
      ),
    );

    expect(offer).toMatchObject({
      sizes: [
        { id: SMALL, isAvailable: false },
        { id: MEDIUM, isAvailable: true },
        { id: LARGE, isAvailable: false },
      ],
    });
  });
});

/*
 * A11Y-06 / ERR-04 — the tray announces a refused add in its alert. It used to
 * say "Kameez · M" and nothing else: which size, but not that the add had failed
 * or that the size had gone. The sentence is whole in each language, with the
 * piece and the size the backend named in its own slots.
 */
describe('the card’s words for a size that sold out under the add', () => {
  it.each([
    ['English', en, 'Kameez in M has just sold out.'],
    ['Urdu', ur, 'Kameez سائز M میں ابھی ختم ہو گیا ہے۔'],
  ] as const)(
    'say in %s that the add failed because the size has gone',
    (_language, messages, said) => {
      const words = formatTemplate(messages.catalogue.quickAddUnavailable, {
        piece: 'Kameez',
        size: 'M',
      });

      expect(words).toBe(said);
    },
  );
});
