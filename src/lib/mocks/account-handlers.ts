import { http, HttpResponse } from 'msw';

import { ENDPOINTS } from '@/lib/api/endpoints';
import { API_HEADERS } from '@/lib/api/headers';

import { removeItem, saveItems, savedItemsFor } from './wishlist-db';

/**
 * D1 — §28.3's account, standing in for Java. Today that is the saved items.
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
];
