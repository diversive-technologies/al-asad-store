import { assertNever } from '@/lib/result';

import type { CatalogueQuery, FacetKey, ResultPage, SearchFacets } from '../schemas/search.schema';
import {
  LIST_FACETS,
  setCollection,
  setInStockOnly,
  setPriceRange,
  toggleFacetValue,
} from './query-changes';

/**
 * MOD-04 — pure. The removable chips of section 28.1: what is applied, in a
 * stable order, and how each one is taken off again. Split out of
 * `search-params.ts` (MOD-03).
 */

/**
 * TS-06 — a discriminated union rather than optional-property soup, so a chip
 * cannot be half a price chip and half a facet chip.
 *
 * Chips carry no user-visible copy beyond the labels the backend already
 * localised. Price and stock wording is resolved from SSOT-07 by
 * `filter-labels.ts`; putting it here would embed English in a pure module
 * (I18N-01).
 */
export type ActiveFilter =
  | { kind: 'collection'; id: string; slug: string; label: string }
  | { kind: 'facet'; id: string; facet: FacetKey; value: string; label: string }
  | { kind: 'price'; id: string; minMinor: number | null; maxMinor: number | null }
  | { kind: 'inStock'; id: string };

/** What the backend said about the collection a listing is scoped to. */
export type ServedCollection = ResultPage['collection'];

function labelFor(facets: SearchFacets | null, facet: FacetKey, value: string): string {
  const entry = facets?.[facet].find((candidate) => candidate.value === value);
  // Falling back to the raw value keeps a chip readable when the index is
  // degraded and no labels came back at all (section 15).
  return entry?.label ?? value;
}

function facetChips(query: CatalogueQuery, facets: SearchFacets | null): ActiveFilter[] {
  const listChips = LIST_FACETS.flatMap((facet) =>
    query[facet].map((value): ActiveFilter => ({
      kind: 'facet',
      id: `${facet}:${value}`,
      facet,
      value,
      label: labelFor(facets, facet, value),
    })),
  );

  const countChips = query.pieceCount.map((count): ActiveFilter => {
    const value = String(count);
    return {
      kind: 'facet',
      id: `pieceCount:${value}`,
      facet: 'pieceCount',
      value,
      label: labelFor(facets, 'pieceCount', value),
    };
  });

  return [...listChips, ...countChips];
}

/**
 * The removable chips of section 28.1, in a stable order: the collection the
 * listing is scoped to first, because every other chip narrows it.
 *
 * The collection chip is named by the backend when it knows the collection, and
 * by its slug when it does not — an unknown collection still has to be
 * removable, or a stale link would leave the reader stuck on an empty page.
 */
export function listActiveFilters(
  query: CatalogueQuery,
  facets: SearchFacets | null,
  collection: ServedCollection = null,
): readonly ActiveFilter[] {
  const chips: ActiveFilter[] = [];

  if (query.collection !== null) {
    const name = collection?.slug === query.collection ? collection.name : query.collection;
    chips.push({ kind: 'collection', id: 'collection', slug: query.collection, label: name });
  }

  chips.push(...facetChips(query, facets));

  if (query.priceMinMinor !== null || query.priceMaxMinor !== null) {
    chips.push({
      kind: 'price',
      id: 'price',
      minMinor: query.priceMinMinor,
      maxMinor: query.priceMaxMinor,
    });
  }

  if (query.inStockOnly) chips.push({ kind: 'inStock', id: 'inStock' });

  return chips;
}

/** Removing a chip is the inverse of whatever set it. */
export function removeActiveFilter(query: CatalogueQuery, chip: ActiveFilter): CatalogueQuery {
  switch (chip.kind) {
    case 'collection':
      return setCollection(query, null);
    case 'facet':
      return toggleFacetValue(query, chip.facet, chip.value);
    case 'price':
      return setPriceRange(query, null, null);
    case 'inStock':
      return setInStockOnly(query, false);
    default:
      // TS-07: adding a chip kind without a removal path is a compile error.
      return assertNever(chip);
  }
}
