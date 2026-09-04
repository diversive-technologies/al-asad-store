import { DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n/locales';

import {
  CATALOGUE,
  toProductCard,
  vocabularyLabel,
  type CatalogueRecord,
  type ProductCardPayload,
} from './catalogue-db';

/** TS-08: the payloads these handlers produce, declared rather than inferred. */
interface FacetEntryPayload {
  value: string;
  label: string;
  count: number;
}

interface FacetsPayload {
  fabric: FacetEntryPayload[];
  colour: FacetEntryPayload[];
  garmentType: FacetEntryPayload[];
  pieceCount: FacetEntryPayload[];
  priceBounds: { minMinor: number; maxMinor: number };
  inStockCount: number;
}

export interface ResultPagePayload {
  products: ProductCardPayload[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: FacetsPayload;
}

export interface SuggestionsPayload {
  terms: string[];
  products: ProductCardPayload[];
}

/**
 * D1 — the search behaviour of section 15, standing in for the Java service.
 *
 * This deliberately re-implements query parsing rather than importing the
 * frontend's module. MOD-01 forbids `lib/` importing from `features/`, and the
 * constraint is faithful to the real boundary: the Java service will parse these
 * parameters from the contract, not from our TypeScript. The query-string format
 * IS the contract, and both sides implement it independently.
 *
 * The point of making this mock behave properly — filtering, sorting, paging and
 * counting for real — is that a mock returning a fixed list would let a filter
 * panel be built that looks correct and is wrong the moment real filter context
 * applies.
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
  sort: 'sort',
  page: 'page',
  locale: 'locale',
} as const;

const PAGE_SIZE = 24;

interface MockQuery {
  term: string;
  fabric: string[];
  colour: string[];
  garmentType: string[];
  pieceCount: number[];
  priceMinMinor: number | null;
  priceMaxMinor: number | null;
  inStockOnly: boolean;
  sort: string;
  page: number;
  locale: Locale;
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

function readQuery(url: URL): MockQuery {
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
    sort: url.searchParams.get(PARAM.sort) ?? 'NEWEST',
    page: integer(url, PARAM.page) ?? 1,
    locale: isLocale(localeParam) ? localeParam : DEFAULT_LOCALE,
  };
}

/** Which criteria a record must satisfy, optionally ignoring one facet. */
type Criterion = 'term' | 'fabric' | 'colour' | 'garmentType' | 'pieceCount' | 'price' | 'inStock';

function matchesTerm(record: CatalogueRecord, query: MockQuery): boolean {
  if (query.term.length === 0) return true;

  const haystack = [
    record.code,
    record.slug,
    vocabularyLabel(query.locale, record.fabric),
    vocabularyLabel(query.locale, record.colour),
    vocabularyLabel(query.locale, record.workType),
    vocabularyLabel(query.locale, record.garmentType),
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query.term);
}

function matches(record: CatalogueRecord, query: MockQuery, ignore?: Criterion): boolean {
  if (ignore !== 'term' && !matchesTerm(record, query)) return false;
  if (ignore !== 'fabric' && query.fabric.length > 0 && !query.fabric.includes(record.fabric)) {
    return false;
  }
  if (ignore !== 'colour' && query.colour.length > 0 && !query.colour.includes(record.colour)) {
    return false;
  }
  if (
    ignore !== 'garmentType' &&
    query.garmentType.length > 0 &&
    !query.garmentType.includes(record.garmentType)
  ) {
    return false;
  }
  if (
    ignore !== 'pieceCount' &&
    query.pieceCount.length > 0 &&
    !query.pieceCount.includes(record.pieceCount)
  ) {
    return false;
  }
  if (ignore !== 'price') {
    if (query.priceMinMinor !== null && record.currentMinor < query.priceMinMinor) return false;
    if (query.priceMaxMinor !== null && record.currentMinor > query.priceMaxMinor) return false;
  }
  if (ignore !== 'inStock' && query.inStockOnly && !record.isInStock) return false;

  return true;
}

function sortRecords(records: CatalogueRecord[], sort: string): CatalogueRecord[] {
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

function countBy(
  records: readonly CatalogueRecord[],
  locale: Locale,
  pick: (record: CatalogueRecord) => string,
) {
  const counts = new Map<string, number>();
  for (const record of records) {
    const value = pick(record);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: vocabularyLabel(locale, value), count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Section 15: "Facet counts reflect the current filter context, not the whole
 * catalogue."
 *
 * Each facet is counted with every OTHER filter applied but NOT its own. That is
 * what makes the numbers useful: they answer "how many would I get if I also
 * picked this?" rather than "how many did I already pick?", which would show
 * zero beside every unselected value the moment one was chosen.
 */
function buildFacets(query: MockQuery): FacetsPayload {
  const forFacet = (ignore: Criterion) => CATALOGUE.filter((r) => matches(r, query, ignore));

  const priceScope = forFacet('price');
  const prices = priceScope.map((record) => record.currentMinor);

  return {
    fabric: countBy(forFacet('fabric'), query.locale, (r) => r.fabric),
    colour: countBy(forFacet('colour'), query.locale, (r) => r.colour),
    garmentType: countBy(forFacet('garmentType'), query.locale, (r) => r.garmentType),
    pieceCount: countBy(forFacet('pieceCount'), query.locale, (r) => String(r.pieceCount)),
    priceBounds: {
      minMinor: prices.length > 0 ? Math.min(...prices) : 0,
      maxMinor: prices.length > 0 ? Math.max(...prices) : 0,
    },
    inStockCount: forFacet('inStock').filter((record) => record.isInStock).length,
  };
}

export function searchCatalogue(url: URL): ResultPagePayload {
  const query = readQuery(url);

  const matched = sortRecords(
    CATALOGUE.filter((record) => matches(record, query)),
    query.sort,
  );

  const totalPages = Math.ceil(matched.length / PAGE_SIZE);
  const page = Math.min(Math.max(query.page, 1), Math.max(totalPages, 1));
  const start = (page - 1) * PAGE_SIZE;

  return {
    products: matched.slice(start, start + PAGE_SIZE).map((r) => toProductCard(r, query.locale)),
    totalCount: matched.length,
    page,
    pageSize: PAGE_SIZE,
    totalPages,
    facets: buildFacets(query),
  };
}

/** Section 15 `suggest(partial)`. Terms come from the vocabulary, not free text. */
export function suggestCatalogue(url: URL): SuggestionsPayload {
  const query = readQuery(url);
  if (query.term.length === 0) return { terms: [], products: [] };

  const matched = CATALOGUE.filter((record) => matchesTerm(record, query));

  const terms = [
    ...new Set(
      matched.flatMap((record) => [
        vocabularyLabel(query.locale, record.fabric),
        vocabularyLabel(query.locale, record.workType),
      ]),
    ),
  ].slice(0, 5);

  return {
    terms,
    products: matched.slice(0, 4).map((record) => toProductCard(record, query.locale)),
  };
}

/** Section 15 `byCode(code) -> Product?`. */
export function findRecordByCode(code: string, locale: Locale): ProductCardPayload | null {
  const record = CATALOGUE.find((entry) => entry.code.toLowerCase() === code.trim().toLowerCase());
  return record === undefined ? null : toProductCard(record, locale);
}
