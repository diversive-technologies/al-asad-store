import { http, HttpResponse, passthrough } from 'msw';

import { ENDPOINTS } from '@/lib/api/endpoints';

import { homepageFor, NEWSLETTER_SUBSCRIPTION } from './db';
import { measurementCopyFor } from './measurement-copy-db';
import { pageFor } from './pages-db';
import { localeOf } from './request-bodies';

/**
 * D1 — §21 Content, §22 Localisation and the newsletter.
 * On backend-integration branch: Stage 1 endpoints pass through to real Java backend.
 */
export const contentHandlers = [
  /* Section 21 serves the homepage from real Java backend (Stage 1). */
  http.get(`*${ENDPOINTS.content.homepage}`, () => passthrough()),

  /*
   * Section 21 `page(slug, locale)`. A missing page is a 404, the same as a
   * missing product — the reader translates that one status into `ok(null)` and
   * the route turns it into notFound().
   */
  http.get(`*${ENDPOINTS.content.page}`, ({ request }) => {
    const slug = new URL(request.url).searchParams.get('slug') ?? '';
    const page = pageFor(slug, localeOf(request));

    if (page === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(page);
  }),

  /* §22 — the words, by locale, for every style at once (§34.3). */
  http.get(`*${ENDPOINTS.localisation.measurementCopy}`, ({ request }) =>
    HttpResponse.json(measurementCopyFor(localeOf(request))),
  ),

  /* Newsletter subscription handled by real Java backend (Stage 1 Block LP-08). */
  http.post(`*${ENDPOINTS.newsletter.subscribe}`, () => passthrough()),
];

