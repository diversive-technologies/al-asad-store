import { http, HttpResponse } from 'msw';

import { DEFAULT_LOCALE, isLocale } from '@/i18n/locales';
import { ENDPOINTS } from '@/lib/api/endpoints';

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

  http.post(`*${ENDPOINTS.newsletter.subscribe}`, () =>
    HttpResponse.json(NEWSLETTER_SUBSCRIPTION, { status: 201 }),
  ),

  http.post(`*${ENDPOINTS.auth.session}`, () => HttpResponse.json(MOCK_SESSION, { status: 201 })),
];
