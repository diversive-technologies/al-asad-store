import { DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n/locales';

import { isInCollection } from './catalogue-collections';
import { productNameFor, type CatalogueRecord } from './catalogue-db';
import { vocabularyLabel } from './catalogue-vocabulary';

/**
 * D1 — section 15's query CONTRACT as the stand-in for Java reads it, and the
 * one matching rule every search answer applies. Split out of
 * `catalogue-search.ts` (MOD-03).
 *
 * This deliberately re-implements query parsing rather than importing the
 * frontend's module. MOD-01 forbids `lib/` importing from `features/`, and the
 * constraint is faithful to the real boundary: the Java service will parse these
 * parameters from the contract, not from our TypeScript. The query-string format
 * IS the contract, and both sides implement it independently.
 */

/** The contract the Java service must implement. Mirrors PARAM_KEYS. */
const PARAM = {
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
  locale: 'locale',
} as const;

/** The page Java serves; `DEFAULT_PAGE_SIZE` on the storefront must agree with it. */
export const PAGE_SIZE = 12;

export interface MockQuery {
  term: string;
  fabric: string[];
  colour: string[];
  garmentType: string[];
  pieceCount: number[];
  priceMinMinor: number | null;
  priceMaxMinor: number | null;
  inStockOnly: boolean;
  /** §12 `listByCollection` — the scope every other criterion narrows. */
  collection: string | null;
  sort: string;
  page: number;
  locale: Locale;
}

/**
 * A query, and the one availability snapshot it is judged against.
 *
 * The stock half is a SNAPSHOT taken once per request, so every facet of one
 * answer counts against the same moment rather than re-reading the ledger for
 * each record of each facet.
 */
export interface SearchContext {
  readonly query: MockQuery;
  readonly buyableIds: ReadonlySet<string>;
}

function list(url: URL, key: string): string[] {
  const raw = url.searchParams.get(key);
  if (raw === null) return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function integer(url: URL, key: string): number | null {
  const raw = url.searchParams.get(key);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : null;
}

export function readQuery(url: URL): MockQuery {
  const localeParam = url.searchParams.get(PARAM.locale);

  return {
    term: (url.searchParams.get(PARAM.term) ?? '').trim().toLowerCase(),
    fabric: list(url, PARAM.fabric),
    colour: list(url, PARAM.colour),
    garmentType: list(url, PARAM.garmentType),
    pieceCount: list(url, PARAM.pieceCount)
      .map(Number)
      .filter((value) => Number.isInteger(value)),
    priceMinMinor: integer(url, PARAM.priceMin),
    priceMaxMinor: integer(url, PARAM.priceMax),
    inStockOnly: url.searchParams.get(PARAM.inStockOnly) === 'true',
    collection: url.searchParams.get(PARAM.collection),
    sort: url.searchParams.get(PARAM.sort) ?? 'NEWEST',
    page: integer(url, PARAM.page) ?? 1,
    locale: isLocale(localeParam) ? localeParam : DEFAULT_LOCALE,
  };
}

/** Which criteria a record must satisfy, optionally ignoring one facet. */
export type Criterion =
  'term' | 'fabric' | 'colour' | 'garmentType' | 'pieceCount' | 'price' | 'inStock';

/**
 * What a term is matched against: the product's NAME and its garment as well as
 * its code, slug and attributes, in the asked locale.
 *
 * The name and the garment were missing, which is why the panel's own trending
 * searches — "Waistcoat Suit", "Kameez Shalwar" — and every product name typed
 * back came to nothing: the slug says "waistcoat" and no attribute says "suit".
 * A search that cannot find what the store just suggested searching for is the
 * index disagreeing with itself.
 */
function matchesTerm(record: CatalogueRecord, query: MockQuery): boolean {
  if (query.term.length === 0) return true;

  const haystack = [
    record.code,
    record.slug,
    productNameFor(record, query.locale),
    vocabularyLabel(query.locale, record.garment),
    vocabularyLabel(query.locale, record.fabric),
    vocabularyLabel(query.locale, record.colour),
    vocabularyLabel(query.locale, record.workType),
    vocabularyLabel(query.locale, record.garmentType),
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query.term);
}

/** Whether a record's facet value passes a multi-value filter (empty means no filter). */
function passes<T>(selected: readonly T[], value: T): boolean {
  return selected.length === 0 || selected.includes(value);
}

export function matches(
  record: CatalogueRecord,
  context: SearchContext,
  ignore?: Criterion,
): boolean {
  const { query } = context;

  // The collection is the SCOPE, never a facet, so no count ever ignores it.
  if (query.collection !== null && !isInCollection(record, query.collection)) return false;
  if (ignore !== 'term' && !matchesTerm(record, query)) return false;
  if (ignore !== 'fabric' && !passes(query.fabric, record.fabric)) return false;
  if (ignore !== 'colour' && !passes(query.colour, record.colour)) return false;
  if (ignore !== 'garmentType' && !passes(query.garmentType, record.garmentType)) return false;
  if (ignore !== 'pieceCount' && !passes(query.pieceCount, record.pieceCount)) return false;
  if (ignore !== 'price') {
    if (query.priceMinMinor !== null && record.currentMinor < query.priceMinMinor) return false;
    if (query.priceMaxMinor !== null && record.currentMinor > query.priceMaxMinor) return false;
  }
  // §15: stock is never read from the index — the live overlay decides this one.
  if (ignore !== 'inStock' && query.inStockOnly && !context.buyableIds.has(record.id)) {
    return false;
  }

  return true;
}

export function sortRecords(records: CatalogueRecord[], sort: string): CatalogueRecord[] {
  const sorted = [...records];

  switch (sort) {
    case 'PRICE_ASC':
      return sorted.sort((a, b) => a.currentMinor - b.currentMinor);
    case 'PRICE_DESC':
      return sorted.sort((a, b) => b.currentMinor - a.currentMinor);
    case 'RELEVANCE':
      // A stand-in for index ranking: newer first among equally relevant items.
      return sorted.sort((a, b) => Date.parse(b.launchedAt) - Date.parse(a.launchedAt));
    default:
      return sorted.sort((a, b) => Date.parse(b.launchedAt) - Date.parse(a.launchedAt));
  }
}

export function countBy(
  records: readonly CatalogueRecord[],
  locale: Locale,
  pick: (record: CatalogueRecord) => string,
): { value: string; label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    const value = pick(record);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: vocabularyLabel(locale, value), count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
