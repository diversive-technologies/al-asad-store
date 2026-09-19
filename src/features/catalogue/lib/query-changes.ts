import type { CatalogueQuery, FacetKey, SortOption } from '../schemas/search.schema';
import { EMPTY_QUERY, normaliseList } from './search-params';

/**
 * MOD-04 — pure. Every change a listing control can make to a query, split out
 * of `search-params.ts` (MOD-03) so the translation between an address and a
 * query and the rules for changing one are separate modules.
 *
 * One rule governs all of them: a change that is not itself a page change
 * returns to page one.
 */

/**
 * Every change that is not itself a page change returns to page one.
 *
 * Narrowing a filter while on page 7 of the old result set would otherwise land
 * the customer on an empty page — technically correct and plainly wrong.
 */
function withFilterChange(query: CatalogueQuery, changes: Partial<CatalogueQuery>): CatalogueQuery {
  return { ...query, ...changes, page: 1 };
}

/** The facets held as lists of strings; piece count is held as numbers. */
export const LIST_FACETS = ['fabric', 'colour', 'garmentType'] as const;
type ListFacetKey = (typeof LIST_FACETS)[number];

function isListFacet(facet: FacetKey): facet is ListFacetKey {
  return (LIST_FACETS as readonly FacetKey[]).includes(facet);
}

/** Adds a facet value if absent, removes it if present. */
export function toggleFacetValue(
  query: CatalogueQuery,
  facet: FacetKey,
  value: string,
): CatalogueQuery {
  if (facet === 'pieceCount') {
    const count = Number(value);
    if (!Number.isInteger(count) || count <= 0) return query;

    const next = query.pieceCount.includes(count)
      ? query.pieceCount.filter((entry) => entry !== count)
      : [...query.pieceCount, count].sort((a, b) => a - b);

    return withFilterChange(query, { pieceCount: next });
  }

  if (!isListFacet(facet)) return query;

  const current = query[facet];
  const next = current.includes(value)
    ? current.filter((entry) => entry !== value)
    : normaliseList([...current, value]);

  return withFilterChange(query, { [facet]: next });
}

export function setSort(query: CatalogueQuery, sort: SortOption): CatalogueQuery {
  return withFilterChange(query, { sort });
}

export function setInStockOnly(query: CatalogueQuery, inStockOnly: boolean): CatalogueQuery {
  return withFilterChange(query, { inStockOnly });
}

export function setPriceRange(
  query: CatalogueQuery,
  minMinor: number | null,
  maxMinor: number | null,
): CatalogueQuery {
  return withFilterChange(query, { priceMinMinor: minMinor, priceMaxMinor: maxMinor });
}

/** Leaving a collection widens the listing, so it is a filter change like any other. */
export function setCollection(query: CatalogueQuery, collection: string | null): CatalogueQuery {
  return withFilterChange(query, { collection });
}

/** Paging is the one change that does NOT reset the page. */
export function setPage(query: CatalogueQuery, page: number): CatalogueQuery {
  return { ...query, page: Number.isInteger(page) && page > 0 ? page : 1 };
}

/**
 * Clears the filters and keeps the term. "Clear all" on a search results page
 * means "drop my filters", not "abandon my search". A collection goes with the
 * filters: it is shown as a chip, and "Clear all" clears every chip.
 */
export function clearFilters(query: CatalogueQuery): CatalogueQuery {
  return { ...EMPTY_QUERY, term: query.term, sort: query.sort };
}

export function hasActiveFilters(query: CatalogueQuery): boolean {
  return (
    query.fabric.length > 0 ||
    query.colour.length > 0 ||
    query.garmentType.length > 0 ||
    query.pieceCount.length > 0 ||
    query.priceMinMinor !== null ||
    query.priceMaxMinor !== null ||
    query.inStockOnly ||
    query.collection !== null
  );
}
