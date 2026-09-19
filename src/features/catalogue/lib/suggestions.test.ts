import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';
import { ur } from '@/i18n/messages/ur';
import type { ProductId } from '@/lib/domain/ids';

import type { ProductCard } from '../schemas/product-card.schema';
import { suggestionsSchema, type Suggestions } from '../schemas/search.schema';
import {
  EMPTY_SUGGESTIONS,
  NO_ACTIVE_OPTION,
  nextActiveIndex,
  productsShownStatus,
  toSuggestionOptions,
} from './suggestions';

function productFixture(id: string, name: string): ProductCard {
  return {
    // TS-12: ids are branded. Fixtures brand directly rather than round-trip
    // through the schema, which is exercised at the API boundary instead.
    id: id as ProductId,
    slug: `${name.toLowerCase()}-${id}`,
    name,
    type: 'SIMPLE',
    pieceCount: 1,
    images: ['/placeholders/product-1.avif'],
    workType: 'Printed',
    fabricName: 'Lawn',
    colourName: 'Ivory',
    pricing: { currentMinor: 349_900, originalMinor: null },
    metreage: null,
    isNew: false,
    isMadeToMeasure: true,
  };
}

const EMPTY: Suggestions = { terms: [], products: [], refinements: [], collection: null };

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

  it('opens the product itself, rather than searching for its name', () => {
    /*
     * This used to assert the opposite. `/catalogue/[slug]` did not exist, so a
     * product row ran a search for the product's NAME — a suggestion leading to
     * a real result set beats one leading to a 404. M3 built the route, so the
     * compromise is gone, and searching by name would now be actively wrong:
     * two products sharing a word would send the reader to a list instead of
     * the item they picked.
     */
    const product = productFixture('p1', 'Printed Lawn');
    const options = toSuggestionOptions({ terms: [], products: [product] });

    expect(options[0]?.destination).toEqual({ kind: 'PRODUCT', slug: product.slug });
  });

  it('sends a term row to a search', () => {
    const options = toSuggestionOptions({ terms: ['boski'], products: [] });

    expect(options[0]?.destination).toEqual({ kind: 'SEARCH', term: 'boski' });
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

describe('EMPTY_SUGGESTIONS', () => {
  /* The BFF's answer for an unreachable index. It must pass the schema the panel
     parses it with, or a down index reads as a broken contract. */
  it('satisfies the suggestions schema', () => {
    expect(suggestionsSchema.safeParse(EMPTY_SUGGESTIONS).success).toBe(true);
  });
});

/**
 * §30.3 — the search panel's live region. It used to say "0 results" while the
 * answer was on its way, "1 results" for one match, and the number of cards drawn
 * as if it were every match.
 */
describe('productsShownStatus', () => {
  const four = ['p1', 'p2', 'p3', 'p4'].map((id) => productFixture(id, `Suit ${id}`));

  it.each([
    ['nothing while the answer is on its way, or could not be had', undefined, 'en', ''],
    [
      'the one product shown, in the singular',
      { products: four.slice(0, 1) },
      'en',
      '1 product shown',
    ],
    ['how many are shown, not how many matched', { products: four }, 'en', '4 products shown'],
    ['the count in Urdu, in its own words', { products: four }, 'ur', '4 مصنوعات دکھائی گئیں'],
  ] as const)('says %s', (_case, suggestions, locale, expected) => {
    const forms = { en, ur }[locale].search.resultCount;

    expect(productsShownStatus(suggestions, forms, locale)).toBe(expected);
  });
});
