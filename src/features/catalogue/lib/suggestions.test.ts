import { describe, expect, it } from 'vitest';

import type { ProductId } from '@/lib/domain/ids';

import type { ProductCard } from '../schemas/product-card.schema';
import type { Suggestions } from '../schemas/search.schema';
import { NO_ACTIVE_OPTION, nextActiveIndex, toSuggestionOptions } from './suggestions';

function productFixture(id: string, name: string): ProductCard {
  return {
    // TS-12: ids are branded. Fixtures brand directly rather than round-trip
    // through the schema, which is exercised at the API boundary instead.
    id: id as ProductId,
    slug: `${name.toLowerCase()}-${id}`,
    name,
    type: 'SIMPLE',
    pieceCount: 1,
    imageUrl: '/placeholders/product-1.avif',
    hoverImageUrl: null,
    workType: 'Printed',
    fabricName: 'Lawn',
    colourName: 'Ivory',
    pricing: { currentMinor: 349_900, originalMinor: null },
    metreage: null,
    isNew: false,
  };
}

const EMPTY: Suggestions = { terms: [], products: [] };

describe('toSuggestionOptions', () => {
  it('returns nothing for an empty payload', () => {
    expect(toSuggestionOptions(EMPTY)).toEqual([]);
  });

  it('puts terms before products, so the cheapest match is reachable first', () => {
    const options = toSuggestionOptions({
      terms: ['Lawn', 'Chiffon'],
      products: [productFixture('p1', 'Printed Lawn')],
    });

    expect(options.map((option) => option.label)).toEqual(['Lawn', 'Chiffon', 'Printed Lawn']);
  });

  it('distinguishes a term from a product with identical text', () => {
    const options = toSuggestionOptions({
      terms: ['Lawn'],
      products: [productFixture('p1', 'Lawn')],
    });

    // CMP-10: colliding ids would break both `key` and `aria-activedescendant`.
    expect(new Set(options.map((option) => option.id)).size).toBe(2);
  });

  it('carries the product on product rows and nothing on term rows', () => {
    const options = toSuggestionOptions({
      terms: ['Lawn'],
      products: [productFixture('p1', 'Printed Lawn')],
    });

    expect(options[0]?.product).toBeNull();
    expect(options[1]?.product?.id).toBe('p1');
  });

  it('searches a product row by its name rather than opening the product', () => {
    // Deliberate until M3 exists: a suggestion must not lead to a 404.
    const options = toSuggestionOptions({
      terms: [],
      products: [productFixture('p1', 'Printed Lawn')],
    });

    expect(options[0]?.searchTerm).toBe('Printed Lawn');
  });
});

describe('nextActiveIndex', () => {
  it('reports nothing active when the list is empty', () => {
    expect(nextActiveIndex(NO_ACTIVE_OPTION, 1, 0)).toBe(NO_ACTIVE_OPTION);
    expect(nextActiveIndex(2, -1, 0)).toBe(NO_ACTIVE_OPTION);
  });

  it('moves down from nothing active to the first option', () => {
    expect(nextActiveIndex(NO_ACTIVE_OPTION, 1, 3)).toBe(0);
  });

  it('moves up from nothing active to the last option', () => {
    expect(nextActiveIndex(NO_ACTIVE_OPTION, -1, 3)).toBe(2);
  });

  it('wraps forwards past the end', () => {
    expect(nextActiveIndex(2, 1, 3)).toBe(0);
  });

  it('wraps backwards past the start', () => {
    expect(nextActiveIndex(0, -1, 3)).toBe(2);
  });

  it('steps normally in the middle', () => {
    expect(nextActiveIndex(0, 1, 3)).toBe(1);
    expect(nextActiveIndex(2, -1, 3)).toBe(1);
  });
});
