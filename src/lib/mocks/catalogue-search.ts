import type { Locale } from '@/i18n/locales';

import { buyableProductIds } from './availability-db';
import {
  BEST_SELLERS_COLLECTION,
  collectionRecords,
  servedCollection,
} from './catalogue-collections';
import { CATALOGUE, toProductCard, type ProductCardPayload } from './catalogue-db';
import {
  countBy,
  matches,
  PAGE_SIZE,
  readQuery,
  sortRecords,
  type Criterion,
  type SearchContext,
} from './catalogue-query';
import { buildRefinements, type RefinementPayload } from './catalogue-refinements';
import { vocabularyLabel } from './catalogue-vocabulary';

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
  collection: { slug: string; name: string } | null;
}

export interface SuggestionsPayload {
  terms: string[];
  products: ProductCardPayload[];
  refinements: RefinementPayload[];
  /** The collection merchandised products are drawn from; `null` for matches. */
  collection: string | null;
}

/**
 * D1 — the search behaviour of section 15, standing in for the Java service.
 * The query contract and the matching rule are `catalogue-query.ts`; the
 * refinements the search panel offers are `catalogue-refinements.ts` (MOD-03).
 *
 * The point of making this mock behave properly — filtering, sorting, paging and
 * counting for real — is that a mock returning a fixed list would let a filter
 * panel be built that looks correct and is wrong the moment real filter context
 * applies.
 */

/**
 * A query and the live availability snapshot it is judged against.
 *
 * §15: "Stock is never read from the index. Availability is overlaid live." So
 * "In stock only", its count and the best sellers read the SAME overlay the
 * cards and the product page do — `availability-db.ts` — and a product whose
 * last unit is in somebody's bag drops out of all of them together.
 */
function contextFor(url: URL): SearchContext {
  return { query: readQuery(url), buyableIds: buyableProductIds() };
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
function buildFacets(context: SearchContext): FacetsPayload {
  const { query } = context;
  const forFacet = (ignore: Criterion) => CATALOGUE.filter((r) => matches(r, context, ignore));

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
    inStockCount: forFacet('inStock').filter((record) => context.buyableIds.has(record.id)).length,
  };
}

export function searchCatalogue(url: URL): ResultPagePayload {
  const context = contextFor(url);
  const { query } = context;

  const matched = sortRecords(
    CATALOGUE.filter((record) => matches(record, context)),
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
    facets: buildFacets(context),
    collection: servedCollection(query.collection, query.locale),
  };
}

/** Section 15 `suggest(partial)`. Terms come from the vocabulary, not free text. */
export function suggestCatalogue(url: URL): SuggestionsPayload {
  const context = contextFor(url);
  const { query } = context;

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
      // Best sellers buyable now, from the collection the panel's "View all" opens.
      products: collectionRecords(BEST_SELLERS_COLLECTION)
        .filter((record) => context.buyableIds.has(record.id))
        .slice(0, 4)
        .map((record) => toProductCard(record, query.locale)),
      collection: BEST_SELLERS_COLLECTION,
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
  const matched = CATALOGUE.filter((record) => matches(record, context));

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
    refinements: buildRefinements(context),
    collection: null,
  };
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
