import { describe, expect, it } from 'vitest';

import type { ProductId } from '@/lib/domain/ids';

import type { ProductAvailability } from '../schemas/availability.schema';
import type { ProductCard } from '../schemas/product-card.schema';
import { deriveProductBadges, mergeAvailability } from './product-card';

function makeProduct(overrides: Partial<ProductCard> = {}): ProductCard {
  return {
    // TS-03(2)-adjacent: test fixtures brand ids directly rather than round-trip
    // through the schema, which is exercised separately at the API boundary.
    id: 'p1' as ProductId,
    slug: 'lawn-three-piece',
    name: 'Lawn three-piece',
    type: 'SET',
    pieceCount: 3,
    imageUrl: '/placeholders/product-1.png',
    hoverImageUrl: null,
    workType: 'Embroidered',
    fabricName: 'Lawn',
    colourName: 'Ivory',
    pricing: { currentMinor: 1_249_900, originalMinor: null },
    metreage: null,
    isNew: false,
    ...overrides,
  };
}

function makeAvailability(status: ProductAvailability['status'], id = 'p1'): ProductAvailability {
  return { productId: id as ProductId, status, unavailablePieceNames: [] };
}

describe('deriveProductBadges', () => {
  it('returns no badges for an ordinary in-stock product', () => {
    expect(deriveProductBadges(makeProduct(), makeAvailability('IN_STOCK'))).toEqual([]);
  });

  it('shows only Sold out, suppressing New and Sale', () => {
    const product = makeProduct({
      isNew: true,
      pricing: { currentMinor: 900_000, originalMinor: 1_249_900 },
    });

    expect(deriveProductBadges(product, makeAvailability('SOLD_OUT'))).toEqual(['SOLD_OUT']);
  });

  it('combines New, Sale and Low stock', () => {
    const product = makeProduct({
      isNew: true,
      pricing: { currentMinor: 900_000, originalMinor: 1_249_900 },
    });

    expect(deriveProductBadges(product, makeAvailability('LOW_STOCK'))).toEqual([
      'NEW',
      'DISCOUNT',
      'LOW_STOCK',
    ]);
  });

  it('never claims a stock state when availability is unknown', () => {
    const badges = deriveProductBadges(makeProduct({ isNew: true }), null);

    expect(badges).toEqual(['NEW']);
    expect(badges).not.toContain('SOLD_OUT');
    expect(badges).not.toContain('LOW_STOCK');
  });
});

describe('mergeAvailability', () => {
  it('matches by id rather than by position', () => {
    const products = [makeProduct({ id: 'a' as ProductId }), makeProduct({ id: 'b' as ProductId })];
    // Deliberately reversed: the two reads are independent and need not align.
    const overlay = [makeAvailability('SOLD_OUT', 'b'), makeAvailability('IN_STOCK', 'a')];

    const merged = mergeAvailability(products, overlay);

    expect(merged[0]?.availability?.status).toBe('IN_STOCK');
    expect(merged[1]?.availability?.status).toBe('SOLD_OUT');
  });

  it('yields null availability for a product the overlay omitted', () => {
    const merged = mergeAvailability([makeProduct({ id: 'a' as ProductId })], []);

    expect(merged[0]?.availability).toBeNull();
  });
});
