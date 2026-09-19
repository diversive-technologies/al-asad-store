import { http, HttpResponse } from 'msw';

import { ENDPOINTS } from '@/lib/api/endpoints';

import { homepageFor, NEWSLETTER_SUBSCRIPTION } from './db';
import { measurementCopyFor } from './measurement-copy-db';
import { pageFor } from './pages-db';
import { localeOf } from './request-bodies';

/**
 * D1 — §21 Content, §22 Localisation and the newsletter, standing in for Java.
 * Split out of `handlers.ts` (MOD-03), one handler module per module.
 *
 * The locale arrives as a query parameter rather than a header so that every
 * cache between the page and the backend keys the two languages separately.
 */
export const contentHandlers = [
  /* Section 21 serves the homepage per locale. */
  http.get(`*${ENDPOINTS.content.homepage}`, ({ request }) =>
    HttpResponse.json(homepageFor(localeOf(request))),
  ),

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

  http.post(`*${ENDPOINTS.newsletter.subscribe}`, () =>
    HttpResponse.json(NEWSLETTER_SUBSCRIPTION, { status: 201 }),
  ),
];
