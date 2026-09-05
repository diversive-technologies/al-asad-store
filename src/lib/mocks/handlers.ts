import { http, HttpResponse } from 'msw';

import { DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n/locales';
import { ENDPOINTS } from '@/lib/api/endpoints';

import {
  addItem,
  applyCode,
  cartExists,
  createCart,
  removeCode,
  removeLine,
  summaryFor,
  updateQuantity,
} from './bag-db';
import { reservedLookup } from './bag-reservations';
import { findOrder, placeOrder, quoteFor } from './checkout-db';
import { findRecordByCode, searchCatalogue, suggestCatalogue } from './catalogue-search';
import { pageFor } from './pages-db';
import { evaluateFabric, findProductBySlug, productAvailabilityFor } from './product-detail-db';
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
/** Locale travels as a query param on every localised read (see the note above). */
function localeOf(request: Request): Locale {
  const requested = new URL(request.url).searchParams.get('locale');
  return isLocale(requested) ? requested : DEFAULT_LOCALE;
}

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
   * Section 21 `page(slug, locale)`. A missing page is a 404, the same as a
   * missing product — the reader translates that one status into `ok(null)` and
   * the route turns it into notFound().
   */
  http.get(`*${ENDPOINTS.content.page}`, ({ request }) => {
    const url = new URL(request.url);
    const requested = url.searchParams.get('locale');
    const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;
    const page = pageFor(url.searchParams.get('slug') ?? '', locale);

    if (page === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(page);
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
  /*
   * Section 12 `getProduct`, keyed by slug. A miss is a 404 for the same reason
   * `byCode` is: "no such product" is an HTTP outcome, and the feature's reader
   * translates that one status back into `ok(null)` so the route can render a
   * not-found page rather than an error.
   */
  http.get(`*${ENDPOINTS.catalogue.product}`, ({ request }) => {
    const url = new URL(request.url);
    const requestedLocale = url.searchParams.get('locale');
    const locale = isLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
    const product = findProductBySlug(url.searchParams.get('slug') ?? '', locale);

    if (product === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(product);
  }),

  /*
   * The live per-size overlay, keyed by product id. It is derived from the same
   * fixture the product itself came from, so the piece ids in the two payloads
   * are guaranteed to be the same ones.
   */
  http.get(`*${ENDPOINTS.catalogue.productAvailability}`, ({ request }) => {
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId') ?? '';
    /*
     * Locale is irrelevant to a stock answer — it decides labels, and this
     * payload carries none. The default is passed only because the fixture
     * shares one derivation with the product itself.
     */
    /*
     * §7.3 read-time exclusion. The overlay subtracts what other carts are
     * actively holding, so taking the last unit of a size makes it read sold out
     * for everyone else on their next load — with no job having run.
     */
    const availability = productAvailabilityFor(productId, DEFAULT_LOCALE, reservedLookup());

    if (availability === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(availability);
  }),

  http.get(`*${ENDPOINTS.catalogue.byCode}`, ({ request }) => {
    const url = new URL(request.url);
    const requestedLocale = url.searchParams.get('locale');
    const locale = isLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
    const product = findRecordByCode(url.searchParams.get('code') ?? '', locale);

    if (product === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(product);
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

  http.post(`*${ENDPOINTS.newsletter.subscribe}`, () =>
    HttpResponse.json(NEWSLETTER_SUBSCRIPTION, { status: 201 }),
  ),

  http.post(`*${ENDPOINTS.auth.session}`, () => HttpResponse.json(MOCK_SESSION, { status: 201 })),

  /*
   * §16 CartService. The cart id is in the PATH because that is how the Java
   * service will address it; the BFF is what keeps it in an httpOnly cookie so
   * the browser never composes one of these URLs itself.
   */
  http.post(`*${ENDPOINTS.bag.summary}`, () =>
    HttpResponse.json({ id: createCart() }, { status: 201 }),
  ),

  http.get(`*${ENDPOINTS.bag.cart(':cartId')}`, ({ params, request }) => {
    const summary = summaryFor(String(params.cartId), localeOf(request));
    if (summary === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(summary);
  }),

  /*
   * §16 `addItem` -> `Ok | Unavailable(piece)`.
   *
   * Both outcomes are 200, and that is deliberate. `Unavailable(piece)` is an
   * EXPECTED answer, not a transport failure — someone else took the last one —
   * so it travels as a value in a discriminated union (ERR-01), which is also
   * the only shape `apiRequest` can deliver: it turns every non-2xx into an
   * `ApiError` and the body, with the name of the piece in it, would be lost.
   * A 4xx is reserved for the cart genuinely not existing.
   */
  http.post(`*${ENDPOINTS.bag.items(':cartId')}`, async ({ params, request }) => {
    /*
     * `.clone()` is load-bearing, not caution.
     *
     * MSW walks its handler list to find a match, and a resolver that reads the
     * body CONSUMES the stream — so the next handler to look at the same
     * request gets `Body is unusable: Body has already been read` and the whole
     * lookup throws. Every bag write posts a body, so all three collided.
     * Cloning leaves the original stream untouched for whoever comes next.
     */
    const body: unknown = await request.clone().json();
    const input = body as {
      productId?: string;
      selections?: { pieceId: string; sizeId: string }[];
      quantity?: number;
    };

    const result = addItem(
      String(params.cartId),
      input.productId ?? '',
      input.selections ?? [],
      input.quantity ?? 1,
      localeOf(request),
    );

    if (result.kind === 'NOT_FOUND') return new HttpResponse(null, { status: 404 });
    if (result.kind === 'UNAVAILABLE') return HttpResponse.json(result);
    return HttpResponse.json({ kind: 'ADDED', summary: result.summary }, { status: 201 });
  }),

  http.patch(`*${ENDPOINTS.bag.line(':cartId', ':lineId')}`, async ({ params, request }) => {
    /*
     * `.clone()` is load-bearing, not caution.
     *
     * MSW walks its handler list to find a match, and a resolver that reads the
     * body CONSUMES the stream — so the next handler to look at the same
     * request gets `Body is unusable: Body has already been read` and the whole
     * lookup throws. Every bag write posts a body, so all three collided.
     * Cloning leaves the original stream untouched for whoever comes next.
     */
    const body: unknown = await request.clone().json();
    const quantity = (body as { quantity?: number }).quantity ?? 1;

    const result = updateQuantity(
      String(params.cartId),
      String(params.lineId),
      quantity,
      localeOf(request),
    );

    if (result.kind === 'NOT_FOUND') return new HttpResponse(null, { status: 404 });
    if (result.kind === 'UNAVAILABLE') return HttpResponse.json(result);
    return HttpResponse.json({ kind: 'ADDED', summary: result.summary });
  }),

  http.delete(`*${ENDPOINTS.bag.line(':cartId', ':lineId')}`, ({ params, request }) => {
    const result = removeLine(String(params.cartId), String(params.lineId), localeOf(request));
    if (result.kind !== 'ADDED') return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ kind: 'ADDED', summary: result.summary });
  }),

  /* §16 `applyCode`. A refused code is an outcome, not an error, for the same
     reason as `Unavailable` above — Pricing's answer travels in the body. */
  http.post(`*${ENDPOINTS.bag.code(':cartId')}`, async ({ params, request }) => {
    /*
     * `.clone()` is load-bearing, not caution.
     *
     * MSW walks its handler list to find a match, and a resolver that reads the
     * body CONSUMES the stream — so the next handler to look at the same
     * request gets `Body is unusable: Body has already been read` and the whole
     * lookup throws. Every bag write posts a body, so all three collided.
     * Cloning leaves the original stream untouched for whoever comes next.
     */
    const body: unknown = await request.clone().json();
    const locale = localeOf(request);
    const result = applyCode(String(params.cartId), (body as { code?: string }).code ?? '', locale);

    if (result.kind === 'REJECTED') return HttpResponse.json(result);
    return HttpResponse.json({ kind: 'APPLIED', summary: result.summary });
  }),

  http.delete(`*${ENDPOINTS.bag.code(':cartId')}`, ({ params, request }) => {
    const result = removeCode(String(params.cartId), localeOf(request));
    if (result.kind === 'REJECTED') return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ kind: 'APPLIED', summary: result.summary });
  }),

  http.head(`*${ENDPOINTS.bag.cart(':cartId')}`, ({ params }) =>
    new HttpResponse(null, { status: cartExists(String(params.cartId)) ? 200 : 404 }),
  ),

  /*
   * §17 `quote(cart, address, deliveryOption)`. A GET because it stores nothing
   * and is a pure function of the cart plus the two choices that change the
   * total — which is also why those two are its query parameters.
   */
  http.get(`*${ENDPOINTS.checkout.quote(':cartId')}`, ({ params, request }) => {
    const url = new URL(request.url);
    const quote = quoteFor(
      String(params.cartId),
      localeOf(request),
      url.searchParams.get('deliveryOptionId') ?? '',
      url.searchParams.get('isGift') === 'true',
    );

    if (quote === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(quote);
  }),

  /*
   * §7.2. Every outcome below is a 200 carrying a union member, for the reason
   * the bag's writes are: an expired hold and a changed price are what the
   * transaction is SPECIFIED to do, not failures of the request, and both carry
   * detail the interface has to render.
   */
  http.post(`*${ENDPOINTS.checkout.place(':cartId')}`, async ({ params, request }) => {
    const body: unknown = await request.clone().json();
    const outcome = placeOrder(
      String(params.cartId),
      body as Parameters<typeof placeOrder>[1],
      localeOf(request),
    );

    if (outcome.kind === 'NOT_FOUND') return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(outcome);
  }),

  http.get(`*${ENDPOINTS.checkout.order(':orderNumber')}`, ({ params }) => {
    const order = findOrder(String(params.orderNumber));
    if (order === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(order);
  }),
];
