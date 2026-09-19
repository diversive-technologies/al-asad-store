import { http, HttpResponse } from 'msw';

import { DEFAULT_LOCALE } from '@/i18n/locales';
import { ENDPOINTS } from '@/lib/api/endpoints';

import { cardAvailabilityFor, productAvailabilityFor } from './availability-db';
import { readRelatedQuery, relatedProductsFor } from './catalogue-related';
import {
  findRecordByCode,
  findRecordsByIds,
  searchCatalogue,
  suggestCatalogue,
} from './catalogue-search';
import { sitemapProductsAt } from './catalogue-sitemap';
import { evaluateFabric } from './fabric-calculator-db';
import { findProductBySlug } from './product-detail-db';
import { localeOf } from './request-bodies';

/**
 * D1 — §12 Catalogue, §15 Search, Inventory's §8.2 overlays and §25's Fabric
 * Calculator, standing in for Java. Split out of `handlers.ts` (MOD-03).
 */

/** A comma-separated id list from the query, trimmed, with blanks dropped. */
function idsOf(request: Request): string[] | null {
  const raw = new URL(request.url).searchParams.get('productIds');
  if (raw === null) return null;

  return raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

export const catalogueHandlers = [
  /*
   * The card overlay of §8.2, answered from the same live ledger as the product
   * page's — so a card and its page cannot disagree. It answers only for the ids
   * it was asked about and does NOT invent an entry for a product it holds no
   * record of; that absence is what exercises the "availability unknown" path
   * in the interface (DATA-13a).
   */
  http.get(`*${ENDPOINTS.catalogue.availability}`, ({ request }) =>
    HttpResponse.json(cardAvailabilityFor(idsOf(request), localeOf(request))),
  ),

  /*
   * Section 15 `search`. This genuinely filters, sorts, pages and computes
   * facet counts in the current filter context — a handler returning a fixed
   * list would let a filter panel be built that looks right and is wrong the
   * moment the real service applies context.
   */
  http.get(`*${ENDPOINTS.catalogue.search}`, ({ request }) =>
    HttpResponse.json(searchCatalogue(new URL(request.url))),
  ),

  http.get(`*${ENDPOINTS.catalogue.suggest}`, ({ request }) =>
    HttpResponse.json(suggestCatalogue(new URL(request.url))),
  ),

  /*
   * Section 12 `getProduct`, keyed by slug. A miss is a 404 because "no such
   * product" is an HTTP outcome, and the feature's reader translates that one
   * status back into `ok(null)` so the route can render a not-found page rather
   * than an error.
   */
  http.get(`*${ENDPOINTS.catalogue.product}`, ({ request }) => {
    const slug = new URL(request.url).searchParams.get('slug') ?? '';
    const product = findProductBySlug(slug, localeOf(request));

    if (product === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(product);
  }),

  /*
   * The live per-size overlay, keyed by product id. §7.3 read-time exclusion:
   * it subtracts what carts are actively holding and what orders have taken, so
   * taking the last unit of a size makes it read sold out for everyone on their
   * next load — with no job having run.
   *
   * Locale is irrelevant to a stock answer — it decides labels, and this payload
   * carries none. The default is passed only because the fixture shares one
   * derivation with the product itself.
   */
  http.get(`*${ENDPOINTS.catalogue.productAvailability}`, ({ request }) => {
    const productId = new URL(request.url).searchParams.get('productId') ?? '';
    const availability = productAvailabilityFor(productId, DEFAULT_LOCALE);

    if (availability === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(availability);
  }),

  /* Section 15 `byCode(code) -> Product?`. A miss is a 404 rather than a null body. */
  http.get(`*${ENDPOINTS.catalogue.byCode}`, ({ request }) => {
    const code = new URL(request.url).searchParams.get('code') ?? '';
    const product = findRecordByCode(code, localeOf(request));

    if (product === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(product);
  }),

  /*
   * Several projections in one read, for the saved-items list.
   *
   * No 404 for a missing id: the response is whichever of them exist, in the
   * order asked for. A product withdrawn since a customer saved it is an
   * ordinary outcome here, and the list should show what is left rather than
   * fail whole.
   */
  http.get(`*${ENDPOINTS.catalogue.byIds}`, ({ request }) =>
    HttpResponse.json(findRecordsByIds(idsOf(request) ?? [], localeOf(request))),
  ),

  /*
   * §30.5's sitemap feed: every LAUNCHED product, in one unpaged read. Which
   * products are launched is decided in `catalogue-sitemap.ts`, not by the caller.
   */
  http.get(`*${ENDPOINTS.catalogue.sitemap}`, () =>
    HttpResponse.json(sitemapProductsAt(Date.now())),
  ),

  /*
   * §28.2 "You may also like". A malformed query is Java's 400 and an unknown
   * product its 404. Which products relate, and in what order, is
   * `catalogue-related.ts` — and an empty list is an ordinary answer, not a miss.
   */
  http.get(`*${ENDPOINTS.catalogue.related}`, ({ request }) => {
    const query = readRelatedQuery(new URL(request.url));
    if (query === null) return new HttpResponse(null, { status: 400 });

    const related = relatedProductsFor(query, localeOf(request));
    if (related === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(related);
  }),

  /*
   * Section 25. A GET because it is a pure function of its inputs and stores
   * nothing — "No customer input is stored" is an invariant of the module, not
   * an implementation detail, so the request carries no body and no identity.
   */
  http.get(`*${ENDPOINTS.fabricCalculator.evaluate}`, ({ request }) => {
    const url = new URL(request.url);
    const verdict = evaluateFabric(
      url.searchParams.get('productId') ?? '',
      Number(url.searchParams.get('heightCm') ?? '0'),
      url.searchParams.get('styleId') ?? '',
    );

    if (verdict === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(verdict);
  }),
];
