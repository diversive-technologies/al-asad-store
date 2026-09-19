import type { CatalogueQuery } from '../schemas/search.schema';
import { DEFAULT_SORT, SORT_OPTIONS, type SortOption } from './search-options';

/**
 * MOD-04 — pure, React-free, framework-free. The catalogue's entire state lives
 * in the URL (STATE-01 rung 4, section 28.1), so this module is the single
 * translation between an address and a query, and everything else — the listing
 * page, the filter panel, pagination, search — depends on it.
 *
 * What a query CHANGES into is `query-changes.ts`, and the removable chips it
 * shows are `active-filters.ts` (MOD-03). This file is only the two directions
 * of the translation.
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
  collection: 'collection',
  sort: 'sort',
  page: 'page',
} as const;

const LIST_SEPARATOR = ',';

/**
 * What a collection slug may look like: lowercase words joined by single
 * hyphens. Anything else is dropped rather than forwarded, so a mangled address
 * cannot become a second spelling of the same collection.
 */
const COLLECTION_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COLLECTION_SLUG_MAX = 100;

export const EMPTY_QUERY: CatalogueQuery = {
  term: '',
  fabric: [],
  colour: [],
  garmentType: [],
  pieceCount: [],
  priceMinMinor: null,
  priceMaxMinor: null,
  inStockOnly: false,
  collection: null,
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

/** Trimmed, non-empty, de-duplicated and sorted — so order can never vary. */
export function normaliseList(values: readonly string[]): string[] {
  return [
    ...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)),
  ].sort();
}

function readList(raw: RawParams, key: string): string[] {
  const value = readSingle(raw, key);
  if (value === null) return [];

  return normaliseList(value.split(LIST_SEPARATOR));
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

/**
 * A collection slug, lower-cased so `New-Arrivals` and `new-arrivals` are one
 * address. Whether the collection EXISTS is the backend's answer, not this
 * module's (DATA-13): an unknown slug travels, and comes back with no results.
 */
function readCollection(raw: RawParams): string | null {
  const value = (readSingle(raw, PARAM_KEYS.collection) ?? '').trim().toLowerCase();
  const isSlug = value.length <= COLLECTION_SLUG_MAX && COLLECTION_SLUG.test(value);
  return isSlug ? value : null;
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
    collection: readCollection(raw),
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
  const setList = (key: string, values: readonly (string | number)[]): void => {
    if (values.length > 0) params.set(key, values.join(LIST_SEPARATOR));
  };

  if (query.term.length > 0) params.set(PARAM_KEYS.term, query.term);
  setList(PARAM_KEYS.fabric, query.fabric);
  setList(PARAM_KEYS.colour, query.colour);
  setList(PARAM_KEYS.garmentType, query.garmentType);
  setList(PARAM_KEYS.pieceCount, query.pieceCount);
  if (query.priceMinMinor !== null) params.set(PARAM_KEYS.priceMin, String(query.priceMinMinor));
  if (query.priceMaxMinor !== null) params.set(PARAM_KEYS.priceMax, String(query.priceMaxMinor));
  if (query.inStockOnly) params.set(PARAM_KEYS.inStockOnly, 'true');
  if (query.collection !== null) params.set(PARAM_KEYS.collection, query.collection);
  if (query.sort !== DEFAULT_SORT) params.set(PARAM_KEYS.sort, query.sort);
  if (query.page > 1) params.set(PARAM_KEYS.page, String(query.page));

  return params;
}

/** The canonical query string, including the leading `?`, or '' when empty. */
export function toQueryString(query: CatalogueQuery): string {
  const params = toSearchParams(query).toString();
  return params.length > 0 ? `?${params}` : '';
}
