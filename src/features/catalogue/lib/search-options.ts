/**
 * The vocabulary of section 15's `SearchQuery`: its sorts, its page size and
 * its facet keys.
 *
 * It lives apart from `search.schema.ts`, which builds the contract from it and
 * re-exports it, because it carries no Zod: `search-params.ts` translates every
 * listing address and is imported by the filter, sort and search controls in
 * the browser, and reading two constants through the schema module put the whole
 * validator in the first-load JavaScript of the catalogue and search pages
 * (PERF-10).
 */

/**
 * TS-10: an `as const` list, not an enum.
 *
 * `RELEVANCE` is deliberately in the list but is only meaningful with a search
 * term — ranking an unfiltered browse by relevance to nothing is not a sort.
 * `parseCatalogueQuery` demotes it to the default when no term is present, so
 * the invalid combination cannot reach the backend.
 *
 * "Best selling" is absent on purpose: there are no delivered orders at launch,
 * which is the same reason section 28.6 defers reviews.
 */
export const SORT_OPTIONS = ['NEWEST', 'PRICE_ASC', 'PRICE_DESC', 'RELEVANCE'] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const DEFAULT_SORT: SortOption = 'NEWEST';
/*
 * The page the backend serves (the mock's `PAGE_SIZE` stands in for it), mirrored
 * here for the grid arithmetic in `grid-columns.ts`: it must divide by every column
 * count, or a page ends on a part-filled row. 12 divides 1, 2, 3, 4 and 6; the
 * operator chose it over 24 so a 24-product catalogue pages at all.
 */
export const DEFAULT_PAGE_SIZE = 12;

/** The six filter groups of section 28.1 — no more, per ADR 15. */
export const FACET_KEYS = ['fabric', 'colour', 'garmentType', 'pieceCount'] as const;
export type FacetKey = (typeof FACET_KEYS)[number];
