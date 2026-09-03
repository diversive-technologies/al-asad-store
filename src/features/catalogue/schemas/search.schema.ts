import { z } from 'zod';

import { productCardSchema } from './product-card.schema';

/**
 * SSOT-09 — the wire contract for section 15's `SearchQuery`.
 *
 * There is ONE query behind both the catalogue listing and the search results
 * page, because section 15 exposes one: `search(term, filters, sort, paging)`.
 * The listing is that query with no term. Modelling them separately would mean
 * two filter implementations that drift apart.
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
export const DEFAULT_PAGE_SIZE = 24;

/** The six filter groups of section 28.1 — no more, per ADR 15. */
export const FACET_KEYS = ['fabric', 'colour', 'garmentType', 'pieceCount'] as const;
export type FacetKey = (typeof FACET_KEYS)[number];

/**
 * A facet value with its count in the CURRENT filter context (section 15). The
 * label arrives already localised: fabric and colour are closed vocabularies
 * owned by Catalogue, and their Urdu forms come from the protected-terms list
 * (I18N-09), so the frontend must never derive a label from a value.
 */
export const facetEntrySchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  count: z.number().int().nonnegative(),
});

export type FacetEntry = z.infer<typeof facetEntrySchema>;

export const searchFacetsSchema = z.object({
  fabric: z.array(facetEntrySchema),
  colour: z.array(facetEntrySchema),
  garmentType: z.array(facetEntrySchema),
  pieceCount: z.array(facetEntrySchema),
  /** Price is a range, not a list, so its facet is the bounds of the result set. */
  priceBounds: z.object({
    minMinor: z.number().int().nonnegative(),
    maxMinor: z.number().int().nonnegative(),
  }),
  /** How many of the current results are purchasable, for the in-stock toggle. */
  inStockCount: z.number().int().nonnegative(),
});

export type SearchFacets = z.infer<typeof searchFacetsSchema>;

/**
 * Section 15: if the index is unavailable, search degrades to a database query
 * with reduced relevance and NO facet counts, rather than failing.
 *
 * `facets: null` is that state, and it is the single representation of it — a
 * separate `isDegraded` flag would be a second source of truth for one fact
 * (PD-01) and the two could disagree. The interface renders filters without
 * counts in this case; inventing a zero would be a lie about the catalogue
 * (DATA-13).
 */
export const resultPageSchema = z.object({
  products: z.array(productCardSchema),
  totalCount: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  facets: searchFacetsSchema.nullable(),
});

export type ResultPage = z.infer<typeof resultPageSchema>;

/**
 * The query itself — the six filters of section 28.1, a sort and a page.
 *
 * This is deliberately strict: every field is present and correctly typed. The
 * lenient, never-throwing coercion from a URL lives in `lib/search-params.ts`,
 * so the contract stays honest about what the backend receives while the parser
 * absorbs whatever a hand-edited address bar contains (SEC-02).
 */
export const catalogueQuerySchema = z.object({
  /** Empty when browsing rather than searching. */
  term: z.string(),
  fabric: z.array(z.string().min(1)),
  colour: z.array(z.string().min(1)),
  garmentType: z.array(z.string().min(1)),
  pieceCount: z.array(z.number().int().positive()),
  /** DATA-11: money in minor units. `null` means the bound is unset. */
  priceMinMinor: z.number().int().nonnegative().nullable(),
  priceMaxMinor: z.number().int().nonnegative().nullable(),
  inStockOnly: z.boolean(),
  sort: z.enum(SORT_OPTIONS),
  page: z.number().int().positive(),
});

export type CatalogueQuery = z.infer<typeof catalogueQuerySchema>;

/** Section 15 `suggest(partial)` — type-ahead, budgeted under 100ms by 30.1. */
export const suggestionsSchema = z.object({
  terms: z.array(z.string().min(1)),
  products: z.array(productCardSchema),
});

export type Suggestions = z.infer<typeof suggestionsSchema>;
