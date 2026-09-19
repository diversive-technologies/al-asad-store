import { http, HttpResponse } from 'msw';

import { ENDPOINTS } from '@/lib/api/endpoints';
import { API_HEADERS } from '@/lib/api/headers';

import { orderHistoryPage } from './orders-db';
import {
  addressesFor,
  makeDefault,
  removeAddress,
  reviseAddress,
  saveAddress,
} from './addresses-db';
import {
  addressChoiceBody,
  addressWriteBody,
  bodyOf,
  headerOf,
  localeOf,
  savedItemsBody,
  savedSizeBody,
} from './request-bodies';
import { forgetSize, saveSize, savedSizesFor } from './saved-sizes-db';
import { removeItem, saveItems, savedItemsFor } from './wishlist-db';

/**
 * D1 — §28.3's account, standing in for Java: the saved items, the addresses and
 * the saved sizes.
 *
 * The account the list belongs to arrives in a header the BFF attaches from the
 * session, never in the body: a list that named its own owner would let any
 * browser read and write any customer's (the same rule §34.4's profiles follow).
 * A request without one is refused rather than served an empty list, because
 * "nobody asked" and "this customer has nothing" are different answers.
 */
const accountKeyOf = (request: Request): string | null => headerOf(request, API_HEADERS.accountKey);

/*
 * SEC-02 — every body is untrusted, and is PARSED against its shape rather than
 * cast (`request-bodies.ts`). The address is parsed by the same rules the
 * contract states, because a mock that accepts what Java would refuse teaches the
 * interface a habit the real backend will break, and a second hand-written copy
 * of the bounds is a second place for them to drift (PD-01). The saved-item count
 * is bounded here too: a stand-in for Java has no business trusting its caller.
 */

export const accountHandlers = [
  /* §28.3 — what this customer has saved. */
  http.get(`*${ENDPOINTS.account.savedItems}`, ({ request }) => {
    const accountKey = accountKeyOf(request);
    if (accountKey === null) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json({ ids: savedItemsFor(accountKey) });
  }),

  /* Saving. A list rather than one id, so the browser-held list a customer
     arrives with can be offered to the account in one request. */
  http.post(`*${ENDPOINTS.account.savedItems}`, async ({ request }) => {
    const accountKey = accountKeyOf(request);
    if (accountKey === null) return new HttpResponse(null, { status: 401 });

    const body = await bodyOf(request, savedItemsBody);
    if (body === null) return new HttpResponse(null, { status: 400 });
    return HttpResponse.json({ ids: saveItems(accountKey, body.productIds) });
  }),

  /* D6 — a removal is RECORDED at its own path; there is no DELETE anywhere. */
  http.post(`*${ENDPOINTS.account.savedItemRemoval}`, async ({ request }) => {
    const accountKey = accountKeyOf(request);
    if (accountKey === null) return new HttpResponse(null, { status: 401 });

    const body = await bodyOf(request, savedItemsBody);
    if (body === null) return new HttpResponse(null, { status: 400 });

    let list = savedItemsFor(accountKey);
    for (const id of body.productIds) list = removeItem(accountKey, id);
    return HttpResponse.json({ ids: list });
  }),

  /* §28.3 — the address book. */
  http.get(`*${ENDPOINTS.account.addresses}`, ({ request }) => {
    const accountKey = accountKeyOf(request);
    if (accountKey === null) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json({ addresses: addressesFor(accountKey) });
  }),

  /* Saving one, or REVISING one when the body names an id. The id is minted
     here because identity is the backend's to give — a client that named its
     own address id could write over another customer's row number. */
  http.post(`*${ENDPOINTS.account.addresses}`, async ({ request }) => {
    const accountKey = accountKeyOf(request);
    if (accountKey === null) return new HttpResponse(null, { status: 401 });

    const body = await bodyOf(request, addressWriteBody);
    if (body === null) return new HttpResponse(null, { status: 400 });

    if (body.addressId !== undefined) {
      const revised = reviseAddress(accountKey, body.addressId, body.address);
      /* An id this account does not hold is NOT FOUND rather than refused: the
         customer may be looking at a page opened before they removed it. */
      if (revised === null) return new HttpResponse(null, { status: 404 });
      return HttpResponse.json({ addresses: revised });
    }

    const saved = saveAddress(accountKey, body.address, crypto.randomUUID());
    if (saved === 'FULL') return new HttpResponse(null, { status: 409 });
    return HttpResponse.json({ addresses: saved });
  }),

  /* D6 — a removal is RECORDED at its own path; there is no DELETE anywhere. */
  http.post(`*${ENDPOINTS.account.addressRemoval}`, async ({ request }) => {
    const accountKey = accountKeyOf(request);
    if (accountKey === null) return new HttpResponse(null, { status: 401 });

    const body = await bodyOf(request, addressChoiceBody);
    if (body === null) return new HttpResponse(null, { status: 400 });

    const list = removeAddress(accountKey, body.addressId);
    if (list === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ addresses: list });
  }),

  /* §28.3 — what this customer has bought, a page at a time. A guest's orders are
     not here: they carry no account and are found by their number, which is what
     addresses them. A page asked for badly is a 400, not a guess. */
  http.get(`*${ENDPOINTS.account.orders}`, ({ request }) => {
    const accountKey = accountKeyOf(request);
    if (accountKey === null) return new HttpResponse(null, { status: 401 });

    const page = orderHistoryPage(accountKey, new URL(request.url).searchParams);
    if (page === null) return new HttpResponse(null, { status: 400 });
    return HttpResponse.json(page);
  }),

  /* §28.3 — the sizes this customer asked us to remember, one per size set. */
  http.get(`*${ENDPOINTS.account.savedSizes}`, ({ request }) => {
    const accountKey = accountKeyOf(request);
    if (accountKey === null) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json({ sizes: savedSizesFor(accountKey, localeOf(request)) });
  }),

  /* Saving one. The body names a SIZE; which set it supersedes is the store's
     rule (DATA-13). A size of no set — the one size of a sizeless piece
     included — is a 404, exactly as an unknown address id is. */
  http.post(`*${ENDPOINTS.account.savedSizes}`, async ({ request }) => {
    const accountKey = accountKeyOf(request);
    if (accountKey === null) return new HttpResponse(null, { status: 401 });

    const body = await bodyOf(request, savedSizeBody);
    if (body === null) return new HttpResponse(null, { status: 400 });

    const sizes = saveSize(accountKey, body.sizeId, localeOf(request));
    if (sizes === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ sizes });
  }),

  /* D6 — forgetting is RECORDED at its own path; there is no DELETE anywhere. */
  http.post(`*${ENDPOINTS.account.savedSizeRemoval}`, async ({ request }) => {
    const accountKey = accountKeyOf(request);
    if (accountKey === null) return new HttpResponse(null, { status: 401 });

    const body = await bodyOf(request, savedSizeBody);
    if (body === null) return new HttpResponse(null, { status: 400 });

    const sizes = forgetSize(accountKey, body.sizeId, localeOf(request));
    if (sizes === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ sizes });
  }),

  /* Choosing the default — an event about the book, not an edit to one row. */
  http.post(`*${ENDPOINTS.account.addressDefault}`, async ({ request }) => {
    const accountKey = accountKeyOf(request);
    if (accountKey === null) return new HttpResponse(null, { status: 401 });

    const body = await bodyOf(request, addressChoiceBody);
    if (body === null) return new HttpResponse(null, { status: 400 });

    const list = makeDefault(accountKey, body.addressId);
    if (list === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ addresses: list });
  }),
];
