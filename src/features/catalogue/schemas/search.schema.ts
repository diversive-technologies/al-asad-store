import { z } from 'zod';

import { FACET_KEYS, SORT_OPTIONS } from '../lib/search-options';
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
 * The query's vocabulary — sorts, page size, facet keys — is declared in
 * `lib/search-options.ts`, which carries no Zod (its header says why), and is
 * re-exported here so the contract is still read in one place.
 */
export {
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  FACET_KEYS,
  SORT_OPTIONS,
  type FacetKey,
  type SortOption,
} from '../lib/search-options';

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
  /**
   * The page the backend actually SERVED, which is not always the page asked
   * for: a request past the last page is answered with the last one. Pagination
   * is drawn from this, never from the address (see `servedQuery`).
   */
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  facets: searchFacetsSchema.nullable(),
  /**
   * The collection the results are scoped to, named as the backend names it
   * (§12 `listByCollection`), or `null` when they are not scoped — or when the
   * collection asked for does not exist, in which case there are no results
   * either. The name arrives localised; the frontend never derives it from the
   * slug (I18N-09).
   */
  collection: z
    .object({
      slug: z.string().min(1),
      name: z.string().min(1),
    })
    .nullable(),
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
  /**
   * §12 `listByCollection(collection, paging)` — a Catalogue collection the
   * listing is scoped to, by slug, or `null` for the whole catalogue. Not one of
   * the six filters of §28.1: it is the scope they narrow, which is why a
   * homepage rail's "View all" and the search panel's merchandising can hand a
   * reader to exactly the products they were shown.
   */
  collection: z.string().min(1).nullable(),
  sort: z.enum(SORT_OPTIONS),
  page: z.number().int().positive(),
});

export type CatalogueQuery = z.infer<typeof catalogueQuerySchema>;

/** Section 15 `suggest(partial)` — type-ahead, budgeted under 100ms by 30.1. */
/**
 * One way to narrow the CURRENT search, offered inside the search panel.
 *
 * It is `facetEntrySchema` plus the facet it belongs to, rather than a parallel
 * shape (PD-01): a refinement IS a facet value, and its `label` arrives already
 * localised for the same reason — fabric and colour are closed vocabularies
 * owned by Catalogue, so the frontend must never derive a label from a value.
 *
 * The COUNT is the load-bearing field, and it is why this comes from the
 * backend rather than being assembled here. The panel shows four products out
 * of however many matched; counting fabrics from those four would produce
 * numbers that are simply wrong. Only the service that ran the query knows how
 * many `boski` results the term actually has (DATA-13).
 */
export const searchRefinementSchema = facetEntrySchema.extend({
  key: z.enum(FACET_KEYS),
});

export type SearchRefinement = z.infer<typeof searchRefinementSchema>;

export const suggestionsSchema = z.object({
  terms: z.array(z.string().min(1)),
  products: z.array(productCardSchema),
  /**
   * Ways to narrow what was typed, ranked by the backend.
   *
   * Empty is a real answer and the common one: there is nothing to narrow
   * before a term is typed, and a degraded index has no counts to offer — the
   * same condition `facets: null` represents for the listing. The panel simply
   * does not render the section.
   */
  refinements: z.array(searchRefinementSchema),
  /**
   * The collection the products are drawn from when the backend MERCHANDISED
   * them — the empty box's best sellers — rather than matched them against a
   * term. It is what the panel's "View all" opens, so the listing a reader lands
   * on holds the products they were just shown. `null` when the products are
   * matches, and then "View all" carries the search instead.
   *
   * Which collection that is belongs to the operator (§21), so the interface
   * names none of them (D5).
   */
  collection: z.string().min(1).nullable(),
});

export type Suggestions = z.infer<typeof suggestionsSchema>;
