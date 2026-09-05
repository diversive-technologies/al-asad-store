import { describe, expect, it } from 'vitest';

import { CATALOGUE } from './catalogue-db';
import { findRecordByCode, searchCatalogue, suggestCatalogue } from './catalogue-search';

/**
 * These assert the CONTRACT of section 15, not merely this fixture.
 *
 * Under D1 the mock is the executable specification of that contract until the
 * Java service exists, so the behaviours pinned here — contextual facet counts,
 * paging, and stock as a coarse filter flag — are the ones the real service has
 * to reproduce. A bug in the counting semantics would otherwise be discovered
 * only after a filter panel had been built on top of it.
 */
function search(query: string) {
  return searchCatalogue(new URL(`http://mock/api/v1/catalogue/search${query}`));
}

describe('paging', () => {
  it('returns the whole catalogue across pages', () => {
    const first = search('');

    expect(first.totalCount).toBe(CATALOGUE.length);
    expect(first.page).toBe(1);
    expect(first.products).toHaveLength(first.pageSize);
    expect(first.totalPages).toBe(Math.ceil(CATALOGUE.length / first.pageSize));
  });

  it('serves the remainder on the last page', () => {
    const first = search('');
    const last = search(`?page=${String(first.totalPages)}`);

    expect(last.products).toHaveLength(CATALOGUE.length - first.pageSize * (first.totalPages - 1));
  });

  it('clamps a page beyond the end rather than returning nothing', () => {
    const result = search('?page=999');

    expect(result.page).toBe(result.totalPages);
    expect(result.products.length).toBeGreaterThan(0);
  });
});

describe('filtering', () => {
  it('narrows the result set', () => {
    const all = search('');
    const boskiOnly = search('?fabric=boski');

    expect(boskiOnly.totalCount).toBeGreaterThan(0);
    expect(boskiOnly.totalCount).toBeLessThan(all.totalCount);
  });

  it('treats multiple values within one facet as OR', () => {
    const boski = search('?fabric=boski').totalCount;
    const karandi = search('?fabric=karandi').totalCount;
    const both = search('?fabric=boski,karandi').totalCount;

    expect(both).toBe(boski + karandi);
  });

  it('treats separate facets as AND', () => {
    const fabricOnly = search('?fabric=boski').totalCount;
    const combined = search('?fabric=boski&pieceCount=3').totalCount;

    expect(combined).toBeLessThanOrEqual(fabricOnly);
  });

  it('can return an empty result set without breaking', () => {
    const result = search('?priceMin=99000000&priceMax=99000001');

    expect(result.totalCount).toBe(0);
    expect(result.products).toEqual([]);
    expect(result.totalPages).toBe(0);
  });

  it('filters on the coarse stock flag, which is not the live overlay', () => {
    const all = search('').totalCount;
    const inStock = search('?inStock=true').totalCount;

    expect(inStock).toBeLessThan(all);
    expect(inStock).toBe(CATALOGUE.filter((record) => record.isInStock).length);
  });
});

describe('facet counts reflect the current filter context', () => {
  it('does NOT zero the other values in the facet being filtered', () => {
    // The defining behaviour: after choosing Boski, the customer must still see
    // how many Karandi items they would get by switching — otherwise every
    // unselected value reads zero and the panel becomes a dead end.
    const filtered = search('?fabric=boski');
    const karandi = filtered.facets.fabric.find((entry) => entry.value === 'karandi');

    expect(karandi?.count).toBeGreaterThan(0);
  });

  it('counts a facet as if its own selection were not applied', () => {
    const unfiltered = search('');
    const filtered = search('?fabric=boski');

    expect(filtered.facets.fabric).toEqual(unfiltered.facets.fabric);
  });

  it('narrows one facet when a DIFFERENT facet is filtered', () => {
    const unfiltered = search('');
    const byPieces = search('?pieceCount=1');

    const totalUnfiltered = unfiltered.facets.fabric.reduce((sum, e) => sum + e.count, 0);
    const totalFiltered = byPieces.facets.fabric.reduce((sum, e) => sum + e.count, 0);

    expect(totalFiltered).toBeLessThan(totalUnfiltered);
  });

  it('reports price bounds for the current context', () => {
    const { facets } = search('?fabric=boski');

    expect(facets.priceBounds.minMinor).toBeLessThanOrEqual(facets.priceBounds.maxMinor);
  });

  it('localises facet labels rather than echoing the value', () => {
    const english = search('?locale=en').facets.fabric.find((e) => e.value === 'boski');
    const urdu = search('?locale=ur').facets.fabric.find((e) => e.value === 'boski');

    expect(english?.label).toBe('Boski');
    expect(urdu?.label).toBe('بوسکی');
    expect(urdu?.count).toBe(english?.count);
  });
});

describe('sorting', () => {
  it('orders by price ascending and descending', () => {
    const ascending = search('?sort=PRICE_ASC').products.map((p) => p.pricing.currentMinor);
    const descending = search('?sort=PRICE_DESC').products.map((p) => p.pricing.currentMinor);

    expect(ascending).toEqual([...ascending].sort((a, b) => a - b));
    expect(descending).toEqual([...descending].sort((a, b) => b - a));
  });

  it('leaves the result set unchanged in size', () => {
    expect(search('?sort=PRICE_ASC').totalCount).toBe(search('').totalCount);
  });
});

describe('suggest and code lookup', () => {
  it('returns nothing for an empty term rather than the whole catalogue', () => {
    expect(suggestCatalogue(new URL('http://mock/s?q=')).products).toEqual([]);
  });

  it('suggests products matching a partial term', () => {
    const result = suggestCatalogue(new URL('http://mock/s?q=boski'));

    expect(result.products.length).toBeGreaterThan(0);
    expect(result.terms.length).toBeGreaterThan(0);
  });

  it('finds a product by its code, case-insensitively', () => {
    const [first] = CATALOGUE;
    expect(first).toBeDefined();
    if (first === undefined) return;

    expect(findRecordByCode(first.code.toLowerCase(), 'en')?.slug).toBe(first.slug);
  });

  it('returns null for an unknown code — a miss is not a failure', () => {
    expect(findRecordByCode('NOPE-9999', 'en')).toBeNull();
  });
});
