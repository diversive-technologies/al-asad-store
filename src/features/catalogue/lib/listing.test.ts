import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';

import type { ResultPage } from '../schemas/search.schema';
import { clearFilters } from './query-changes';
import { emptyStateFor, listingAnnouncement, servedQuery } from './listing';
import { EMPTY_QUERY, parseCatalogueQuery, toQueryString } from './search-params';

function page(overrides: Partial<ResultPage> = {}): ResultPage {
  return {
    products: [],
    totalCount: 28,
    page: 1,
    pageSize: 24,
    totalPages: 2,
    facets: null,
    collection: null,
    ...overrides,
  };
}

/*
 * BUG-14: `/catalogue?page=99` is served the last page, and pagination drawn from
 * the ADDRESS showed page 2's products under a "previous" arrow to page 98 and
 * no page numbers at all.
 */
describe('servedQuery', () => {
  it('draws from the page the backend served, not the page the address asked for', () => {
    const asked = parseCatalogueQuery({ page: '99', fabric: 'boski' });

    const served = servedQuery(asked, page({ page: 2 }));

    expect(served.page).toBe(2);
    expect(served.fabric).toEqual(['boski']);
  });

  it('leaves a query alone when the page served is the page asked for', () => {
    const asked = parseCatalogueQuery({ page: '2' });

    expect(servedQuery(asked, page({ page: 2 }))).toBe(asked);
  });
});

/*
 * BUG-16: a search that found nothing said "Nothing matches those filters", and
 * its button went to the plain listing and threw the typed words away.
 */
describe('emptyStateFor', () => {
  it('uses search wording when words were typed', () => {
    expect(emptyStateFor(parseCatalogueQuery({ q: 'zzzz' }))).toEqual({
      wording: 'SEARCH',
      recovery: 'BROWSE_ALL',
    });
  });

  it('offers to clear filters, and clearing them keeps the words', () => {
    const query = parseCatalogueQuery({ q: 'boski', garmentType: 'unstitched' });

    expect(emptyStateFor(query).recovery).toBe('CLEAR_FILTERS');
    expect(toQueryString(clearFilters(query))).toBe('?q=boski');
  });

  it('uses the filter wording on the plain listing', () => {
    expect(emptyStateFor({ ...EMPTY_QUERY, inStockOnly: true }).wording).toBe('FILTERS');
  });
});

/* §30.3: a filter, sort or page change has to change the words a live region reads. */
describe('listingAnnouncement', () => {
  it('names the count, the order and the page', () => {
    const text = listingAnnouncement(EMPTY_QUERY, page(), 'en', en);

    expect(text).toBe('28 products. Sorted by Newest. Page 1 of 2.');
  });

  it('changes when the sort changes, though the count does not', () => {
    const newest = listingAnnouncement(EMPTY_QUERY, page(), 'en', en);
    const cheapest = listingAnnouncement({ ...EMPTY_QUERY, sort: 'PRICE_ASC' }, page(), 'en', en);

    expect(cheapest).not.toBe(newest);
  });

  it('names what is applied, a collection by the name the backend gave it', () => {
    const query = parseCatalogueQuery({ collection: 'new-arrivals', inStock: 'true' });
    const text = listingAnnouncement(
      query,
      page({
        totalPages: 0,
        totalCount: 0,
        collection: { slug: 'new-arrivals', name: 'New arrivals' },
      }),
      'en',
      en,
    );

    expect(text).toBe(
      '0 products with New arrivals and In stock only. Sorted by Newest. Page 1 of 1.',
    );
  });
});
