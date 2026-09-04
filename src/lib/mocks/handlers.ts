import { http, HttpResponse } from 'msw';

import { DEFAULT_LOCALE, isLocale } from '@/i18n/locales';
import { ENDPOINTS } from '@/lib/api/endpoints';

import { findRecordByCode, searchCatalogue, suggestCatalogue } from './catalogue-search';
import { AVAILABILITY, homepageFor, MOCK_SESSION, NEWSLETTER_SUBSCRIPTION } from './db';

/**
 * D1 / TEST-04 — network is mocked at the HTTP layer, never by stubbing the
 * project's own API client. Requests therefore travel through `apiRequest`
 * unchanged, exercising the real client, its timeout, its error normalisation
 * and its schema validation.
 *
 * Paths are prefixed with `*` so a handler matches whatever origin
 * `JAVA_API_BASE_URL` currently points at, without duplicating that value here.
 */
export const handlers = [
  /*
   * Section 21 serves the homepage per locale, and the locale arrives as a
   * query parameter rather than a header so that every cache between the page
   * and the backend keys the two languages separately.
   */
  http.get(`*${ENDPOINTS.content.homepage}`, ({ request }) => {
    const requested = new URL(request.url).searchParams.get('locale');
    const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;

    return HttpResponse.json(homepageFor(locale));
  }),

  /*
   * The overlay answers only for the ids it was asked about, the way a real
   * endpoint would. It deliberately does NOT invent an entry for a product it
   * holds no record of — that absence is what exercises the "availability
   * unknown" path in the interface (DATA-13a).
   */
  http.get(`*${ENDPOINTS.catalogue.availability}`, ({ request }) => {
    const requested = new URL(request.url).searchParams.get('productIds');

    if (requested === null) return HttpResponse.json(AVAILABILITY);

    const wanted = new Set(requested.split(','));
    return HttpResponse.json(AVAILABILITY.filter((entry) => wanted.has(entry.productId)));
  }),

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
   * Section 15 `byCode(code) -> Product?`. A miss is a 404 rather than a null
   * body, because "no such product" is an HTTP outcome; the feature's reader
   * translates that one status back into `ok(null)`.
   */
  http.get(`*${ENDPOINTS.catalogue.byCode}`, ({ request }) => {
    const url = new URL(request.url);
    const requestedLocale = url.searchParams.get('locale');
    const locale = isLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
    const product = findRecordByCode(url.searchParams.get('code') ?? '', locale);

    if (product === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(product);
  }),

  http.post(`*${ENDPOINTS.newsletter.subscribe}`, () =>
    HttpResponse.json(NEWSLETTER_SUBSCRIPTION, { status: 201 }),
  ),

  http.post(`*${ENDPOINTS.auth.session}`, () => HttpResponse.json(MOCK_SESSION, { status: 201 })),
];
