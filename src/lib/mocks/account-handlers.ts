import { http, HttpResponse } from 'msw';

import { ENDPOINTS } from '@/lib/api/endpoints';
import { API_HEADERS } from '@/lib/api/headers';
import { addressDetailSchema } from '@/lib/domain/address';

import {
  addressesFor,
  makeDefault,
  removeAddress,
  reviseAddress,
  saveAddress,
} from './addresses-db';
import { removeItem, saveItems, savedItemsFor } from './wishlist-db';

/**
 * D1 — §28.3's account, standing in for Java: the saved items and the addresses.
 *
 * The account the list belongs to arrives in a header the BFF attaches from the
 * session, never in the body: a list that named its own owner would let any
 * browser read and write any customer's (the same rule §34.4's profiles follow).
 * A request without one is refused rather than served an empty list, because
 * "nobody asked" and "this customer has nothing" are different answers.
 */
const accountKeyOf = (request: Request): string | null => {
  const key = request.headers.get(API_HEADERS.accountKey);
  return key === null || key.length === 0 ? null : key;
};

/* SEC-02 — the body is untrusted. Ids are read as unknown and filtered to plain
   strings rather than cast, and the count is bounded: the BFF bounds it too, and
   a stand-in for Java has no business trusting its caller either. */
const MAX_ITEMS = 100;

function idsIn(body: unknown): string[] | null {
  if (typeof body !== 'object' || body === null) return null;
  const raw = (body as { productIds?: unknown }).productIds;
  if (!Array.isArray(raw)) return null;
  const ids = raw.filter((id): id is string => typeof id === 'string' && id.length > 0);
  return ids.length === raw.length && ids.length <= MAX_ITEMS ? ids : null;
}

/* SEC-02 again, for the address bodies. The mock is a stand-in for Java and has
   no business trusting its caller either, so the body is PARSED rather than
   cast — and parsed by the same schema the contract states, because a mock that
   accepts what Java would refuse teaches the interface a habit the real backend
   will break, and a second hand-written copy of the bounds is a second place for
   them to drift (PD-01). Module 18's own handlers read their bodies this way. */
function detailIn(body: unknown) {
  if (typeof body !== 'object' || body === null) return null;
  const parsed = addressDetailSchema.safeParse((body as { address?: unknown }).address);
  return parsed.success ? parsed.data : null;
}

/** An address id the caller sent, which names one it already holds. */
function addressIdIn(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const value = (body as { addressId?: unknown }).addressId;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

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

    // `.clone()` — a resolver that consumes the body breaks the next lookup.
    const ids = idsIn(await request.clone().json());
    if (ids === null) return new HttpResponse(null, { status: 400 });
    return HttpResponse.json({ ids: saveItems(accountKey, ids) });
  }),

  /* D6 — a removal is RECORDED at its own path; there is no DELETE anywhere. */
  http.post(`*${ENDPOINTS.account.savedItemRemoval}`, async ({ request }) => {
    const accountKey = accountKeyOf(request);
    if (accountKey === null) return new HttpResponse(null, { status: 401 });

    const ids = idsIn(await request.clone().json());
    if (ids === null) return new HttpResponse(null, { status: 400 });

    let list = savedItemsFor(accountKey);
    for (const id of ids) list = removeItem(accountKey, id);
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

    const body: unknown = await request.clone().json();
    const detail = detailIn(body);
    if (detail === null) return new HttpResponse(null, { status: 400 });

    const addressId = addressIdIn(body);
    if (addressId !== null) {
      const revised = reviseAddress(accountKey, addressId, detail);
      /* An id this account does not hold is NOT FOUND rather than refused: the
         customer may be looking at a page opened before they removed it. */
      if (revised === null) return new HttpResponse(null, { status: 404 });
      return HttpResponse.json({ addresses: revised });
    }

    const saved = saveAddress(accountKey, detail, crypto.randomUUID());
    if (saved === 'FULL') return new HttpResponse(null, { status: 409 });
    return HttpResponse.json({ addresses: saved });
  }),

  /* D6 — a removal is RECORDED at its own path; there is no DELETE anywhere. */
  http.post(`*${ENDPOINTS.account.addressRemoval}`, async ({ request }) => {
    const accountKey = accountKeyOf(request);
    if (accountKey === null) return new HttpResponse(null, { status: 401 });

    const addressId = addressIdIn(await request.clone().json());
    if (addressId === null) return new HttpResponse(null, { status: 400 });

    const list = removeAddress(accountKey, addressId);
    if (list === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ addresses: list });
  }),

  /* Choosing the default — an event about the book, not an edit to one row. */
  http.post(`*${ENDPOINTS.account.addressDefault}`, async ({ request }) => {
    const accountKey = accountKeyOf(request);
    if (accountKey === null) return new HttpResponse(null, { status: 401 });

    const addressId = addressIdIn(await request.clone().json());
    if (addressId === null) return new HttpResponse(null, { status: 400 });

    const list = makeDefault(accountKey, addressId);
    if (list === null) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ addresses: list });
  }),
];
