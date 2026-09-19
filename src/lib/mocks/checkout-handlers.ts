import { http, HttpResponse } from 'msw';

import { ENDPOINTS } from '@/lib/api/endpoints';
import { API_HEADERS } from '@/lib/api/headers';

import { deliveryOptionFor, placeOrder, quoteFor } from './checkout-db';
import { grantOrderAccess, lookupOrder, readableOrder } from './order-access-db';
import { pathPattern } from './path-pattern';
import { bodyOf, headerOf, localeOf, orderLookupBody, placeBody } from './request-bodies';

/**
 * D1 — §17 CheckoutService and §28.3's order read, standing in for Java. Split
 * out of `handlers.ts` (MOD-03).
 *
 * Who is asking arrives in HEADERS the BFF attached — the account from the
 * session, an order's access token from an httpOnly cookie — and never in a body.
 */

const NOT_FOUND = () => new HttpResponse(null, { status: 404 });

export const checkoutHandlers = [
  /*
   * §17 `quote(cart, address, deliveryOption)`. A GET because it stores nothing
   * and is a pure function of the cart plus the two choices that change the
   * total — which is also why those two are its query parameters.
   */
  http.get(`*${pathPattern(ENDPOINTS.checkout.quote, 'cartId')}`, ({ params, request }) => {
    const url = new URL(request.url);
    /* No option named is the DEFAULT, and the quote says which that is. One the
       store does not offer is a 400, as placement refuses it too: never priced
       as some other option, and never the 404 that means "nothing to check out". */
    const deliveryOptionId = url.searchParams.get('deliveryOptionId');
    if (deliveryOptionFor(deliveryOptionId) === null) {
      return new HttpResponse(null, { status: 400 });
    }

    const quote = quoteFor(
      String(params.cartId),
      localeOf(request),
      deliveryOptionId,
      url.searchParams.get('isGift') === 'true',
    );

    if (quote === null) return NOT_FOUND();
    return HttpResponse.json(quote);
  }),

  /*
   * §7.2. Every outcome below is a 200 carrying a union member, for the reason
   * the bag's writes are: an expired hold and a changed price are what the
   * transaction is SPECIFIED to do, not failures of the request.
   *
   * A placed order answers with an ACCESS TOKEN beside it. Its number is a
   * sequence anyone can guess, so the number alone never reads it back (§28.3);
   * the token is what lets the browser that placed it open the confirmation.
   */
  http.post(`*${pathPattern(ENDPOINTS.checkout.place, 'cartId')}`, async ({ params, request }) => {
    const body = await bodyOf(request, placeBody);
    if (body === null) return new HttpResponse(null, { status: 400 });

    /* Whose order it is comes from the HEADER the BFF attached from the
       session, never from the body. No header is a GUEST — §6.5's null customer. */
    const outcome = placeOrder(
      String(params.cartId),
      body,
      localeOf(request),
      headerOf(request, API_HEADERS.accountKey),
    );

    if (outcome.kind === 'NOT_FOUND') return NOT_FOUND();
    if (outcome.kind === 'INVALID') return new HttpResponse(null, { status: 400 });
    if (outcome.kind !== 'PLACED') return HttpResponse.json(outcome);

    const accessToken = grantOrderAccess(outcome.order.orderNumber, 'PLACEMENT');
    return HttpResponse.json({ ...outcome, accessToken });
  }),

  /*
   * §28.3 — one order, for a reader who may see it. Anyone else, and any number
   * that names nothing, gets the same bare 404.
   */
  http.get(`*${pathPattern(ENDPOINTS.checkout.order, 'orderNumber')}`, ({ params, request }) => {
    const order = readableOrder(String(params.orderNumber), {
      accountKey: headerOf(request, API_HEADERS.accountKey),
      accessToken: headerOf(request, API_HEADERS.orderAccess),
    });
    if (order === null) return NOT_FOUND();
    return HttpResponse.json(order);
  }),

  /*
   * §28.3's guest lookup "by number and mobile". A POST, so the mobile is in a
   * body and never in a URL. A wrong mobile and an unknown number are the same 404.
   */
  http.post(
    `*${pathPattern(ENDPOINTS.checkout.orderLookup, 'orderNumber')}`,
    async ({ params, request }) => {
      const body = await bodyOf(request, orderLookupBody);
      if (body === null) return new HttpResponse(null, { status: 400 });

      const found = lookupOrder(String(params.orderNumber), body.mobile);
      if (found === null) return NOT_FOUND();
      return HttpResponse.json(found);
    },
  ),
];
