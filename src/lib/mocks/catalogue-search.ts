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
  refinements: { key: string; value: string; label: string; count: number }[];
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

  /*
   * An EMPTY query is not an empty answer.
   *
   * The search panel opens before anyone types, and a blank sheet at that
   * moment wastes the most attentive second the customer will give it. So the
   * backend merchandises: the terms it would like people to search for, and the
   * products it would like them to see. Which terms and which products are the
   * operator's decision (§21 content), not the interface's — the frontend only
   * knows that an empty box still gets an answer.
   */
  if (query.term.length === 0) {
    return {
      terms: TRENDING_TERMS[query.locale].slice(0, 5),
      products: CATALOGUE.filter((record) => record.isInStock)
        .slice(0, 4)
        .map((record) => toProductCard(record, query.locale)),
      /*
       * Nothing to narrow yet. A refinement means "narrow THIS search", and
       * before a term is typed there is no search to narrow — offering the
       * catalogue's four largest fabrics here would just be a second navigation
       * menu competing with the trending terms beside it.
       */
      refinements: [],
    };
  }

  /*
   * The term AND the filters. The panel narrows in place, so a request carrying
   * `fabric=boski` must come back with only boski products — the same records
   * `searchCatalogue` would return for that query, so the four shown here are
   * genuinely the first four of the results page.
   */
  const matched = CATALOGUE.filter((record) => matches(record, query));

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
    refinements: buildRefinements(query),
  };
}

/** How many ways to narrow are offered at once. */
const MAX_REFINEMENTS = 6;

/**
 * The ways this search could be narrowed, ranked.
 *
 * Each facet is counted with every OTHER filter applied but NOT its own — the
 * same contextual rule §15 states for the listing, and for the same reason. It
 * is what lets someone who has already chosen Boski still see the other
 * fabrics: count fabric with the fabric filter applied and Boski would be the
 * only one left, so the control that got them there could never take them back.
 *
 * Two kinds of value are withheld, and they are separate rules — collapsing
 * them into one was a bug worth recording. A value shared by EVERY record in
 * its own facet's scope narrows nothing, so it is dropped. A value already
 * SELECTED is not a way to narrow at all; it is the current state, and the
 * panel lists it separately so it can be undone.
 *
 * Comparing a facet-scoped count against the fully filtered total instead —
 * which is what the first version did — wipes out the whole facet the moment
 * one of its values is chosen: with boski picked, every other fabric also
 * counts four, so all four looked like they "narrowed nothing" and the reader
 * lost every route back.
 *
 * Counted over everything that matched, never over the four products the panel
 * happens to show — that is the whole reason this is computed here rather than
 * in the interface. "Boski (7)" is only true if seven of the matches are boski,
 * and the panel cannot know that.
 *
 * Ranked by count and flattened across facets rather than grouped under
 * headings, because the panel has one narrow column: three headings and their
 * values would spend most of it on labels.
 */
function buildRefinements(query: MockQuery): SuggestionsPayload['refinements'] {
  if (CATALOGUE.filter((record) => matches(record, query)).length < 2) return [];

  const forFacet = (ignore: Criterion) => CATALOGUE.filter((r) => matches(r, query, ignore));

  const isSelected = (key: string, value: string): boolean => {
    if (key === 'pieceCount') return query.pieceCount.includes(Number(value));
    if (key === 'fabric') return query.fabric.includes(value);
    if (key === 'colour') return query.colour.includes(value);
    return query.garmentType.includes(value);
  };

  const groups = [
    { key: 'fabric', scope: forFacet('fabric'), pick: (r: CatalogueRecord) => r.fabric },
    { key: 'colour', scope: forFacet('colour'), pick: (r: CatalogueRecord) => r.colour },
    {
      key: 'garmentType',
      scope: forFacet('garmentType'),
      pick: (r: CatalogueRecord) => r.garmentType,
    },
    {
      key: 'pieceCount',
      scope: forFacet('pieceCount'),
      pick: (r: CatalogueRecord) => String(r.pieceCount),
    },
  ];

  return groups
    .flatMap(({ key, scope, pick }) =>
      countBy(scope, query.locale, pick)
        // Shared by everything in this facet's own scope: narrows nothing.
        .filter((entry) => entry.count !== scope.length)
        .map((entry) => ({ key, ...entry })),
    )
    .filter((entry) => !isSelected(entry.key, entry.value))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, MAX_REFINEMENTS);
}

/**
 * What the operator wants searched for, shown while the box is still empty.
 *
 * Hand-written rather than derived from popularity: there is no search log yet,
 * and inventing one from the fixture would produce whatever happens to sort
 * first rather than anything a customer would type. §26's filter-usage report is
 * where the real list eventually comes from.
 */
const TRENDING_TERMS: Record<Locale, readonly string[]> = {
  en: ['Waistcoat Suit', 'Boski', 'Kameez Shalwar', 'Karandi', 'Unstitched'],
  ur: ['واسکٹ سوٹ', 'بوسکی', 'قمیض شلوار', 'کرنڈی', 'بغیر سلے'],
};

/** Section 15 `byCode(code) -> Product?`. */
export function findRecordByCode(code: string, locale: Locale): ProductCardPayload | null {
  const record = CATALOGUE.find((entry) => entry.code.toLowerCase() === code.trim().toLowerCase());
  return record === undefined ? null : toProductCard(record, locale);
}

/**
 * Several product projections in one read, by id.
 *
 * The order of the RESULT follows the order asked for, not the order the
 * catalogue happens to hold. A saved-items list has a meaning to its owner —
 * the sequence they saved things in — and re-sorting it by the fixture's own
 * order would quietly discard that.
 *
 * An id with no product is simply absent. Something withdrawn since it was
 * saved is an expected outcome of this read rather than a failure of it, and
 * the caller can see the shortfall by comparing lengths.
 */
export function findRecordsByIds(ids: readonly string[], locale: Locale): ProductCardPayload[] {
  const byId = new Map(CATALOGUE.map((record) => [record.id, record]));

  return ids
    .map((id) => byId.get(id))
    .filter((record) => record !== undefined)
    .map((record) => toProductCard(record, locale));
}
