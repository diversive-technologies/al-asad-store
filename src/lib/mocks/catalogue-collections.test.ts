import { beforeEach, describe, expect, it } from 'vitest';

import { resetCarts } from './bag-db';
import { resetReservations } from './bag-reservations';
import {
  BEST_SELLERS_COLLECTION,
  collectionRecords,
  NEW_ARRIVALS_COLLECTION,
} from './catalogue-collections';
import { CATALOGUE } from './catalogue-db';
import { searchCatalogue, suggestCatalogue } from './catalogue-search';
import { homepageFor } from './db';

/**
 * BUG-03 and the search panel's "View all": a collection address has to list
 * the collection, and each surface that previews one has to open the collection
 * its products came from.
 */
function search(query: string) {
  return searchCatalogue(new URL(`http://mock/api/v1/catalogue/search${query}`));
}

function suggest(query: string) {
  return suggestCatalogue(new URL(`http://mock/api/v1/catalogue/suggest${query}`));
}

beforeEach(() => {
  resetCarts();
  resetReservations();
});

describe('a listing scoped to a collection', () => {
  it('lists only the collection, and names it in the asked language', () => {
    const members = new Set(collectionRecords(NEW_ARRIVALS_COLLECTION).map((record) => record.id));
    const result = search(`?collection=${NEW_ARRIVALS_COLLECTION}&locale=ur`);

    expect(result.totalCount).toBe(members.size);
    expect(result.totalCount).toBeLessThan(CATALOGUE.length);
    expect(result.products.every((product) => members.has(product.id))).toBe(true);
    expect(result.collection).toEqual({ slug: NEW_ARRIVALS_COLLECTION, name: 'نئی آمد' });
  });

  it('narrows the collection further with a filter, and counts facets inside it', () => {
    const scoped = search(`?collection=${BEST_SELLERS_COLLECTION}`);
    const narrowed = search(`?collection=${BEST_SELLERS_COLLECTION}&pieceCount=3`);

    expect(narrowed.totalCount).toBeLessThanOrEqual(scoped.totalCount);
    const counted = scoped.facets.pieceCount.reduce((sum, entry) => sum + entry.count, 0);
    expect(counted).toBe(scoped.totalCount);
  });

  it('answers a collection it does not hold with nothing, and names none', () => {
    const result = search('?collection=no-such-collection');

    expect(result.totalCount).toBe(0);
    expect(result.collection).toBeNull();
  });

  it('is unscoped without the parameter', () => {
    expect(search('').collection).toBeNull();
    expect(search('').totalCount).toBe(CATALOGUE.length);
  });
});

describe('what a preview opens', () => {
  it('draws the empty search panel from the collection it names', () => {
    const answer = suggest('?q=');
    const members = new Set(collectionRecords(BEST_SELLERS_COLLECTION).map((record) => record.id));

    expect(answer.collection).toBe(BEST_SELLERS_COLLECTION);
    expect(answer.products.length).toBeGreaterThan(0);
    expect(answer.products.every((product) => members.has(product.id))).toBe(true);
  });

  it('names no collection once something is typed, because those are matches', () => {
    expect(suggest('?q=boski').collection).toBeNull();
  });

  it('shows the homepage rail from the collection its View all opens', () => {
    const rail = homepageFor('en').sections.find((section) => section.kind === 'PRODUCT_RAIL');
    const listing = search(`?collection=${NEW_ARRIVALS_COLLECTION}`);

    const railIds = rail !== undefined && 'products' in rail ? rail.products.map((p) => p.id) : [];
    expect(railIds.length).toBeGreaterThan(0);
    expect(listing.products.slice(0, railIds.length).map((product) => product.id)).toEqual(railIds);
  });
});
