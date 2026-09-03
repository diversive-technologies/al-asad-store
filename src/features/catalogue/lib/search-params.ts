import { assertNever } from '@/lib/result';

import {
  DEFAULT_SORT,
  SORT_OPTIONS,
  type CatalogueQuery,
  type FacetKey,
  type SearchFacets,
  type SortOption,
} from '../schemas/search.schema';

/**
 * MOD-04 — pure, React-free, framework-free. The catalogue's entire state lives
 * in the URL (STATE-01 rung 4, section 28.1), so this module is the single
 * translation between an address and a query, and everything else — the listing
 * page, the filter panel, pagination, search — depends on it.
 *
 * Two properties are load-bearing:
 *
 * 1. Parsing is TOTAL. A hand-edited, truncated or stale URL must render a
 *    valid page, never an error. Every field falls back rather than throwing
 *    (SEC-02: untrusted input, validated, never cast).
 *
 * 2. Serialisation is CANONICAL. Defaults are omitted and values are sorted, so
 *    one set of filters has exactly one URL. Without that, `/catalogue?sort=NEWEST`
 *    and `/catalogue` would be two addresses for one page — two cache entries,
 *    and two things for section 30.5 to try to make canonical.
 */

/** SSOT for the query-string keys. Nothing else may spell these. */
export const PARAM_KEYS = {
  term: 'q',
  fabric: 'fabric',
  colour: 'colour',
  garmentType: 'garmentType',
  pieceCount: 'pieceCount',
  priceMin: 'priceMin',
  priceMax: 'priceMax',
  inStockOnly: 'inStock',
  sort: 'sort',
  page: 'page',
} as const;

const LIST_SEPARATOR = ',';

export const EMPTY_QUERY: CatalogueQuery = {
  term: '',
  fabric: [],
  colour: [],
  garmentType: [],
  pieceCount: [],
  priceMinMinor: null,
  priceMaxMinor: null,
  inStockOnly: false,
  sort: DEFAULT_SORT,
  page: 1,
};

/** A search param may arrive as a string, a repeated string, or not at all. */
type RawParams = Readonly<Record<string, string | string[] | undefined>>;

function readSingle(raw: RawParams, key: string): string | null {
  const value = raw[key];
  if (typeof value === 'string') return value;
  // Repeated keys are tolerated but only the first is honoured, so that
  // `?sort=A&sort=B` cannot produce an undefined ordering.
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

function readList(raw: RawParams, key: string): string[] {
  const value = readSingle(raw, key);
  if (value === null) return [];

  return normaliseList(value.split(LIST_SEPARATOR));
}

/** Trimmed, non-empty, de-duplicated and sorted — so order can never vary. */
function normaliseList(values: readonly string[]): string[] {
  return [
    ...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)),
  ].sort();
}

function readPositiveIntegers(raw: RawParams, key: string): number[] {
  const parsed = readList(raw, key)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  return [...new Set(parsed)].sort((a, b) => a - b);
}

function readMoney(raw: RawParams, key: string): number | null {
  const value = readSingle(raw, key);
  if (value === null) return null;

  const parsed = Number(value);
  // DATA-11: money is integer minor units. A fractional or negative bound is
  // discarded rather than rounded, because guessing what someone meant by
  // `priceMin=-5` is worse than ignoring it.
  if (!Number.isInteger(parsed) || parsed < 0) return null;

  return parsed;
}

function isSortOption(value: string | null): value is SortOption {
  return value !== null && (SORT_OPTIONS as readonly string[]).includes(value);
}

/**
 * URL to query. Never throws, never returns a partial object.
 */
export function parseCatalogueQuery(raw: RawParams): CatalogueQuery {
  const term = (readSingle(raw, PARAM_KEYS.term) ?? '').trim();

  const requestedSort = readSingle(raw, PARAM_KEYS.sort);
  const sort: SortOption = isSortOption(requestedSort) ? requestedSort : DEFAULT_SORT;

  const pageValue = Number(readSingle(raw, PARAM_KEYS.page) ?? '1');
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;

  let priceMinMinor = readMoney(raw, PARAM_KEYS.priceMin);
  let priceMaxMinor = readMoney(raw, PARAM_KEYS.priceMax);

  // An inverted range is a typo, not a filter that matches nothing. Swapping is
  // the reading that returns what the customer plainly meant.
  if (priceMinMinor !== null && priceMaxMinor !== null && priceMinMinor > priceMaxMinor) {
    [priceMinMinor, priceMaxMinor] = [priceMaxMinor, priceMinMinor];
  }

  return {
    term,
    fabric: readList(raw, PARAM_KEYS.fabric),
    colour: readList(raw, PARAM_KEYS.colour),
    garmentType: readList(raw, PARAM_KEYS.garmentType),
    pieceCount: readPositiveIntegers(raw, PARAM_KEYS.pieceCount),
    priceMinMinor,
    priceMaxMinor,
    inStockOnly: readSingle(raw, PARAM_KEYS.inStockOnly) === 'true',
    /*
     * Relevance against an empty term is not an ordering. Demoting it here
     * means the invalid combination cannot reach the backend, and cannot be
     * reached by editing the address either.
     */
    sort: sort === 'RELEVANCE' && term.length === 0 ? DEFAULT_SORT : sort,
    page,
  };
}

/**
 * Query to URL. Anything left at its default is omitted, so the plain listing
 * address stays `/catalogue` rather than carrying redundant state.
 */
export function toSearchParams(query: CatalogueQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.term.length > 0) params.set(PARAM_KEYS.term, query.term);
  if (query.fabric.length > 0) params.set(PARAM_KEYS.fabric, query.fabric.join(LIST_SEPARATOR));
  if (query.colour.length > 0) params.set(PARAM_KEYS.colour, query.colour.join(LIST_SEPARATOR));
  if (query.garmentType.length > 0) {
    params.set(PARAM_KEYS.garmentType, query.garmentType.join(LIST_SEPARATOR));
  }
  if (query.pieceCount.length > 0) {
    params.set(PARAM_KEYS.pieceCount, query.pieceCount.join(LIST_SEPARATOR));
  }
  if (query.priceMinMinor !== null) params.set(PARAM_KEYS.priceMin, String(query.priceMinMinor));
  if (query.priceMaxMinor !== null) params.set(PARAM_KEYS.priceMax, String(query.priceMaxMinor));
  if (query.inStockOnly) params.set(PARAM_KEYS.inStockOnly, 'true');
  if (query.sort !== DEFAULT_SORT) params.set(PARAM_KEYS.sort, query.sort);
  if (query.page > 1) params.set(PARAM_KEYS.page, String(query.page));

  return params;
}

/** The canonical query string, including the leading `?`, or '' when empty. */
export function toQueryString(query: CatalogueQuery): string {
  const params = toSearchParams(query).toString();
  return params.length > 0 ? `?${params}` : '';
}

/**
 * Every change that is not itself a page change returns to page one.
 *
 * Narrowing a filter while on page 7 of the old result set would otherwise land
 * the customer on an empty page — technically correct and plainly wrong.
 */
function withFilterChange(query: CatalogueQuery, changes: Partial<CatalogueQuery>): CatalogueQuery {
  return { ...query, ...changes, page: 1 };
}

const LIST_FACETS = ['fabric', 'colour', 'garmentType'] as const;
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

/** Paging is the one change that does NOT reset the page. */
export function setPage(query: CatalogueQuery, page: number): CatalogueQuery {
  return { ...query, page: Number.isInteger(page) && page > 0 ? page : 1 };
}

/**
 * Clears the filters and keeps the term. "Clear all" on a search results page
 * means "drop my filters", not "abandon my search".
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
    query.inStockOnly
  );
}

/**
 * TS-06 — a discriminated union rather than optional-property soup, so a chip
 * cannot be half a price chip and half a facet chip.
 *
 * Chips carry no user-visible copy beyond the label the backend already
 * localised. Price and stock wording is resolved by the component from SSOT-07;
 * putting it here would embed English in a pure module (I18N-01).
 */
export type ActiveFilter =
  | { kind: 'facet'; id: string; facet: FacetKey; value: string; label: string }
  | { kind: 'price'; id: string; minMinor: number | null; maxMinor: number | null }
  | { kind: 'inStock'; id: string };

function labelFor(facets: SearchFacets | null, facet: FacetKey, value: string): string {
  const entry = facets?.[facet].find((candidate) => candidate.value === value);
  // Falling back to the raw value keeps a chip readable when the index is
  // degraded and no labels came back at all (section 15).
  return entry?.label ?? value;
}

/** The removable chips of section 28.1, in a stable order. */
export function listActiveFilters(
  query: CatalogueQuery,
  facets: SearchFacets | null,
): readonly ActiveFilter[] {
  const chips: ActiveFilter[] = [];

  for (const facet of LIST_FACETS) {
    for (const value of query[facet]) {
      chips.push({
        kind: 'facet',
        id: `${facet}:${value}`,
        facet,
        value,
        label: labelFor(facets, facet, value),
      });
    }
  }

  for (const count of query.pieceCount) {
    const value = String(count);
    chips.push({
      kind: 'facet',
      id: `pieceCount:${value}`,
      facet: 'pieceCount',
      value,
      label: labelFor(facets, 'pieceCount', value),
    });
  }

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
