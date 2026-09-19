import { http, HttpResponse } from 'msw';

import { ENDPOINTS } from '@/lib/api/endpoints';
import { API_HEADERS } from '@/lib/api/headers';

import {
  addItem,
  applyCode,
  cartExists,
  createCart,
  moveToWishlist,
  removeCode,
  removeLine,
  summaryFor,
  updateQuantity,
} from './bag-db';
import { pathPattern } from './path-pattern';
import { profileOwnerOf } from './profile-owners';
import { addItemBody, bodyOf, codeBody, headerOf, localeOf, quantityBody } from './request-bodies';

/**
 * D1 — §16 CartService, standing in for Java. Split out of `handlers.ts`, which
 * carries the catalogue and content modules (MOD-03).
 *
 * The cart id is in the PATH because that is how the Java service will address
 * it; the BFF is what keeps it in an httpOnly cookie so the browser never
 * composes one of these URLs itself. Every body is PARSED against its shape
 * (`request-bodies.ts`) and a body of the wrong shape is a 400, as Java's
 * boundary would answer.
 */

const BAD_REQUEST = () => new HttpResponse(null, { status: 400 });

export const bagHandlers = [
  http.post(`*${ENDPOINTS.bag.summary}`, () =>
    HttpResponse.json({ id: createCart() }, { status: 201 }),
  ),

  http.get(`*${pathPattern(ENDPOINTS.bag.cart, 'cartId')}`, ({ params, request }) => {
    const summary = summaryFor(String(params.cartId), localeOf(request));
    if (summary === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(summary);
  }),

  /*
   * Whether a cart is still a bag, and nothing else — no summary is priced and no
   * lapsed line is settled. The BFF asks this before it throws a cart cookie away.
   */
  http.head(
    `*${pathPattern(ENDPOINTS.bag.cart, 'cartId')}`,
    ({ params }) =>
      new HttpResponse(null, { status: cartExists(String(params.cartId)) ? 200 : 404 }),
  ),

  /*
   * §16 `addItem` -> `Ok | Unavailable(piece) | MeasurementsRefused | SelectionRefused`.
   *
   * ADDED is 201; every refusal is a 200, and that is deliberate. Each is an
   * EXPECTED answer, not a transport failure — someone else took the last one; the
   * measurements cannot cut this garment; the product or the sizes named are not
   * ones this cart can take — so they travel as values in a discriminated union
   * (ERR-01), which is also the only shape `apiRequest` can deliver.
   *
   * A 404 means NO SUCH CART, and nothing else. The BFF answers it by replacing
   * the cart cookie, so a refusal of anything the request named must never be one:
   * it would throw a perfectly good bag away.
   */
  http.post(`*${pathPattern(ENDPOINTS.bag.items, 'cartId')}`, async ({ params, request }) => {
    const body = await bodyOf(request, addItemBody);
    if (body === null) return BAD_REQUEST();

    const result = addItem(
      String(params.cartId),
      body.productId,
      body.selections,
      body.quantity,
      localeOf(request),
      /* §34.8 — cut to this saved profile, or picked off the shelf when absent. */
      body.madeToMeasureProfileId ?? null,
      /* WHOSE it is, from the header the BFF attached — never from the body. The
         store refuses a profile this owner does not hold. */
      profileOwnerOf(request.headers.get(API_HEADERS.measurementOwner)),
    );

    if (result.kind === 'NOT_FOUND') return new HttpResponse(null, { status: 404 });
    if (result.kind !== 'ADDED') return HttpResponse.json(result);
    return HttpResponse.json({ kind: 'ADDED', summary: result.summary }, { status: 201 });
  }),

  http.patch(
    `*${pathPattern(ENDPOINTS.bag.line, 'cartId', 'lineId')}`,
    async ({ params, request }) => {
      const body = await bodyOf(request, quantityBody);
      if (body === null) return BAD_REQUEST();

      const result = updateQuantity(
        String(params.cartId),
        String(params.lineId),
        body.quantity,
        localeOf(request),
      );

      if (result.kind === 'NOT_FOUND') return new HttpResponse(null, { status: 404 });
      if (result.kind === 'UNAVAILABLE') return HttpResponse.json(result);
      return HttpResponse.json({ kind: 'ADDED', summary: result.summary });
    },
  ),

  /*
   * D6 — a POST that RECORDS the removal, where this was a DELETE on the line.
   * The line stops being in the bag, its hold is released immediately (§16),
   * and the row stays on file with the reason it left.
   */
  http.post(
    `*${pathPattern(ENDPOINTS.bag.lineRemoval, 'cartId', 'lineId')}`,
    ({ params, request }) => {
      const result = removeLine(String(params.cartId), String(params.lineId), localeOf(request));
      if (result.kind !== 'ADDED') return new HttpResponse(null, { status: 404 });
      return HttpResponse.json({ kind: 'ADDED', summary: result.summary });
    },
  ),

  /*
   * §16 `moveToWishlist`. The saved items belong to an ACCOUNT, named in the
   * header the BFF attached from the session and never in a body; a request
   * without one is refused before the cart is touched, so a guest's line cannot
   * leave the bag for a list nobody owns. Every other answer is a value, and a
   * 404 still means only "no such cart".
   */
  http.post(
    `*${pathPattern(ENDPOINTS.bag.lineWishlistMove, 'cartId', 'lineId')}`,
    ({ params, request }) => {
      const accountKey = headerOf(request, API_HEADERS.accountKey);
      if (accountKey === null) return new HttpResponse(null, { status: 401 });

      const result = moveToWishlist(
        String(params.cartId),
        String(params.lineId),
        accountKey,
        localeOf(request),
      );
      if (result.kind === 'NOT_FOUND') return new HttpResponse(null, { status: 404 });
      return HttpResponse.json(result);
    },
  ),

  /* §16 `applyCode`. A refused code is an outcome, not an error, for the same
     reason as `Unavailable` above — Pricing's answer travels in the body. */
  http.post(`*${pathPattern(ENDPOINTS.bag.code, 'cartId')}`, async ({ params, request }) => {
    const body = await bodyOf(request, codeBody);
    if (body === null) return BAD_REQUEST();

    const result = applyCode(String(params.cartId), body.code, localeOf(request));
    if (result.kind === 'REJECTED') return HttpResponse.json(result);
    return HttpResponse.json({ kind: 'APPLIED', summary: result.summary });
  }),

  /* D6 — lifting the code is recorded, never erased. See the note above. */
  http.post(`*${pathPattern(ENDPOINTS.bag.codeRemoval, 'cartId')}`, ({ params, request }) => {
    const result = removeCode(String(params.cartId), localeOf(request));
    if (result.kind === 'REJECTED') return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ kind: 'APPLIED', summary: result.summary });
  }),
];
