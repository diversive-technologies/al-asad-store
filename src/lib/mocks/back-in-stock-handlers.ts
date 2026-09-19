import { http, HttpResponse } from 'msw';

import { ENDPOINTS } from '@/lib/api/endpoints';
import { API_HEADERS } from '@/lib/api/headers';

import { requestBackInStock } from './back-in-stock-db';
import { backInStockBody, backInStockShape, bodyOf, headerOf, localeOf } from './request-bodies';

/**
 * D1 — §28.2's Notify Me, standing in for Java. Its own module because no
 * existing handler module owns it (see `ENDPOINTS.backInStock`).
 *
 * The account arrives in the header the BFF attached from the session, never in
 * the body. A body of the wrong shape is a 400 and says nothing about anybody; a
 * well-shaped body whose ADDRESS the service will not write to is a 422 — the
 * contract's refusal of what the customer typed, which `apiRequest` reads as
 * `VALIDATION` and the storefront puts back on the address field; a product,
 * piece or size the store does not sell is a 404; every other answer is a 200
 * with a `kind`, because none of them is a failure.
 */
export const backInStockHandlers = [
  http.post(`*${ENDPOINTS.backInStock.requests}`, async ({ request }) => {
    const shape = await bodyOf(request, backInStockShape);
    if (shape === null) return new HttpResponse(null, { status: 400 });

    const body = backInStockBody.safeParse(shape);
    if (!body.success) return new HttpResponse(null, { status: 422 });

    const answer = requestBackInStock({
      ...body.data,
      accountKey: headerOf(request, API_HEADERS.accountKey),
      locale: localeOf(request),
    });

    if (answer === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(answer);
  }),
];
