import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { ENDPOINTS } from '@/lib/api/endpoints';

import { EMPTY_BAG } from '../lib/empty-bag';
import { moveToWishlist } from './bag-server';
import { CART_ID, LINE_ID, recordInto, type Sent } from './test-support';

/**
 * §16 `moveToWishlist` across the HTTP boundary (TEST-04): the real API client
 * and its schema, against per-test handlers answering as the contract says the
 * backend does. What it pins is what the storefront SENDS — the account in the
 * header and nowhere else — and that every answer, refusals included, arrives
 * as a value (TEST-05). Which line moves, and into whose list, is the backend's.
 */

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

const MOVE = `*${ENDPOINTS.bag.lineWishlistMove(CART_ID, LINE_ID)}`;
const ACCOUNT = 'client-moves@example.com';

describe('moveToWishlist through the real client', () => {
  it('names the account in the header and nowhere else, and parses the move', async () => {
    const received: Sent[] = [];
    const moved = { kind: 'MOVED', summary: EMPTY_BAG } as const;
    server.use(
      http.post(
        MOVE,
        recordInto(received, () => HttpResponse.json(moved)),
      ),
    );

    const result = await moveToWishlist(CART_ID, LINE_ID, ACCOUNT, 'ur');

    expect(result).toEqual({ ok: true, value: moved });
    expect(received).toEqual([
      {
        method: 'POST',
        path: ENDPOINTS.bag.lineWishlistMove(CART_ID, LINE_ID),
        locale: 'ur',
        account: ACCOUNT,
        body: {},
      },
    ]);
  });

  it('parses the answer for a line already gone, carrying the bag', async () => {
    const gone = { kind: 'NOT_IN_BAG', summary: EMPTY_BAG } as const;
    server.use(http.post(MOVE, () => HttpResponse.json(gone)));

    const result = await moveToWishlist(CART_ID, LINE_ID, ACCOUNT, 'en');

    expect(result).toEqual({ ok: true, value: gone });
  });

  it.each([
    ['a request with no account', '', 401, 'UNAUTHORIZED'],
    ['a cart that is not a bag', ACCOUNT, 404, 'NOT_FOUND'],
  ])('reports the refusal of %s as a value', async (_label, account, status, kind) => {
    server.use(http.post(MOVE, () => new HttpResponse(null, { status })));

    const result = await moveToWishlist(CART_ID, LINE_ID, account, 'en');

    expect(result).toMatchObject({ ok: false, error: { kind } });
  });
});
