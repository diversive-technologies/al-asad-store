import { describe, expect, it } from 'vitest';

import {
  clearFilters,
  EMPTY_QUERY,
  hasActiveFilters,
  listActiveFilters,
  parseCatalogueQuery,
  removeActiveFilter,
  setPage,
  setPriceRange,
  setSort,
  toggleFacetValue,
  toQueryString,
} from './search-params';
import type { SearchFacets } from '../schemas/search.schema';

const FACETS: SearchFacets = {
  fabric: [{ value: 'lawn', label: 'Lawn', count: 12 }],
  colour: [{ value: 'ivory', label: 'Ivory', count: 4 }],
  garmentType: [{ value: 'unstitched', label: 'Unstitched', count: 7 }],
  pieceCount: [{ value: '3', label: 'Three-piece', count: 5 }],
  priceBounds: { minMinor: 100_000, maxMinor: 2_000_000 },
  inStockCount: 9,
};

describe('parseCatalogueQuery — totality', () => {
  it('returns a complete query from nothing at all', () => {
    expect(parseCatalogueQuery({})).toEqual(EMPTY_QUERY);
  });

  it('survives a hand-mangled URL rather than throwing', () => {
    const query = parseCatalogueQuery({
      page: 'not-a-number',
      sort: 'BY_VIBES',
      pieceCount: '3,-1,abc,0,2',
      priceMin: '12.5',
      priceMax: '-40',
      inStock: 'yes-please',
      fabric: ' , ,lawn, ',
    });

    expect(query.page).toBe(1);
    expect(query.sort).toBe('NEWEST');
    // Only the positive integers survive, de-duplicated and ordered.
    expect(query.pieceCount).toEqual([2, 3]);
    expect(query.priceMinMinor).toBeNull();
    expect(query.priceMaxMinor).toBeNull();
    // Anything but the exact string 'true' is not a truthy filter.
    expect(query.inStockOnly).toBe(false);
    expect(query.fabric).toEqual(['lawn']);
  });

  it('honours only the first value when a key is repeated', () => {
    expect(parseCatalogueQuery({ sort: ['PRICE_ASC', 'PRICE_DESC'] }).sort).toBe('PRICE_ASC');
  });

  it('de-duplicates and sorts list filters so order cannot vary', () => {
    expect(parseCatalogueQuery({ fabric: 'lawn,chiffon,lawn' }).fabric).toEqual([
      'chiffon',
      'lawn',
    ]);
  });
});

describe('parseCatalogueQuery — domain rules', () => {
  it('demotes relevance to the default when there is no term', () => {
    expect(parseCatalogueQuery({ sort: 'RELEVANCE' }).sort).toBe('NEWEST');
  });

  it('keeps relevance once a term is present', () => {
    expect(parseCatalogueQuery({ sort: 'RELEVANCE', q: 'lawn' }).sort).toBe('RELEVANCE');
  });

  it('swaps an inverted price range instead of matching nothing', () => {
    const query = parseCatalogueQuery({ priceMin: '900000', priceMax: '100000' });

    expect(query.priceMinMinor).toBe(100_000);
    expect(query.priceMaxMinor).toBe(900_000);
  });
});

describe('toQueryString — canonical form', () => {
  it('omits every default so the plain listing has a clean address', () => {
    expect(toQueryString(EMPTY_QUERY)).toBe('');
  });

  it('omits the sort when it is the default and page when it is the first', () => {
    const query = { ...EMPTY_QUERY, sort: 'NEWEST' as const, page: 1 };
    expect(toQueryString(query)).toBe('');
  });

  it('round-trips: parsing its own output reproduces the query', () => {
    const query = parseCatalogueQuery({
      q: 'chiffon',
      fabric: 'lawn,chiffon',
      pieceCount: '2,3',
      priceMin: '100000',
      priceMax: '900000',
      inStock: 'true',
      sort: 'PRICE_DESC',
      page: '4',
    });

    const params = new URLSearchParams(toQueryString(query).replace(/^\?/, ''));
    const reparsed = parseCatalogueQuery(Object.fromEntries(params.entries()));

    expect(reparsed).toEqual(query);
  });

  it('gives one address to one set of filters regardless of input order', () => {
    const a = parseCatalogueQuery({ fabric: 'lawn,chiffon' });
    const b = parseCatalogueQuery({ fabric: 'chiffon,lawn' });

    expect(toQueryString(a)).toBe(toQueryString(b));
  });
});

describe('paging behaviour', () => {
  it('returns to page one whenever a filter changes', () => {
    const onPageSeven = { ...EMPTY_QUERY, page: 7 };

    expect(toggleFacetValue(onPageSeven, 'fabric', 'lawn').page).toBe(1);
    expect(setSort(onPageSeven, 'PRICE_ASC').page).toBe(1);
    expect(setPriceRange(onPageSeven, 100, 200).page).toBe(1);
  });

  it('does not reset the page when the change IS the page', () => {
    expect(setPage({ ...EMPTY_QUERY, page: 7 }, 8).page).toBe(8);
  });

  it('refuses a nonsensical page rather than producing one', () => {
    expect(setPage(EMPTY_QUERY, 0).page).toBe(1);
    expect(setPage(EMPTY_QUERY, -3).page).toBe(1);
  });
});

describe('toggleFacetValue', () => {
  it('adds then removes the same value', () => {
    const added = toggleFacetValue(EMPTY_QUERY, 'fabric', 'lawn');
    expect(added.fabric).toEqual(['lawn']);

    expect(toggleFacetValue(added, 'fabric', 'lawn').fabric).toEqual([]);
  });

  it('treats piece count numerically, not as text', () => {
    const added = toggleFacetValue(EMPTY_QUERY, 'pieceCount', '3');
    expect(added.pieceCount).toEqual([3]);

    expect(toggleFacetValue(added, 'pieceCount', '3').pieceCount).toEqual([]);
  });

  it('ignores a piece count that is not a positive integer', () => {
    expect(toggleFacetValue(EMPTY_QUERY, 'pieceCount', 'many')).toEqual(EMPTY_QUERY);
  });
});

describe('clearFilters', () => {
  it('drops the filters but keeps the search the customer typed', () => {
    const query = parseCatalogueQuery({ q: 'lawn', fabric: 'chiffon', inStock: 'true', page: '3' });
    const cleared = clearFilters(query);

    expect(cleared.term).toBe('lawn');
    expect(hasActiveFilters(cleared)).toBe(false);
    expect(cleared.page).toBe(1);
  });
});

describe('active filter chips', () => {
  it('labels chips from the facets the backend localised', () => {
    const query = parseCatalogueQuery({ fabric: 'lawn', pieceCount: '3' });
    const chips = listActiveFilters(query, FACETS);

    expect(chips.map((chip) => ('label' in chip ? chip.label : chip.kind))).toEqual([
      'Lawn',
      'Three-piece',
    ]);
  });

  it('falls back to the raw value when the index gave no facets', () => {
    const chips = listActiveFilters(parseCatalogueQuery({ fabric: 'lawn' }), null);

    // TS-05: narrowed rather than asserted. `noUncheckedIndexedAccess` makes an
    // index access possibly-undefined, and the honest answer is a guard.
    const [chip] = chips;
    expect(chip?.kind).toBe('facet');
    expect(chip !== undefined && chip.kind === 'facet' ? chip.label : null).toBe('lawn');
  });

  it('removing a chip is the exact inverse of setting it', () => {
    const query = parseCatalogueQuery({
      fabric: 'lawn',
      pieceCount: '3',
      priceMin: '100000',
      inStock: 'true',
    });

    const cleared = listActiveFilters(query, FACETS).reduce(removeActiveFilter, query);

    expect(hasActiveFilters(cleared)).toBe(false);
  });
});
