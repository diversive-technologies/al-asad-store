import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ENDPOINTS } from '@/lib/api/endpoints';
import { cartIdSchema } from '@/lib/domain/ids';
import { CART_COOKIE_NAME } from '@/lib/utils/cookies';

import { addToBagRequestSchema } from '../schemas/bag-write.schema';
import { addForCustomer } from './add-for-customer';
import { readCartId } from './cart-cookie';
import { BAG_WITH_LINE, CART_ID, recordInto, STOCK_LINE, trail, type Sent } from './test-support';

/**
 * The bag's add, end to end below the Route Handler: the real API client, the
 * real cart cookie logic, and per-test handlers at the HTTP layer (TEST-04)
 * answering exactly what each case needs — with only the framework's cookie
 * store replaced by a jar.
 *
 * What it pins is the one irreversible step in the add path — throwing the cart
 * cookie away. An add the cart merely REFUSED used to come back as NOT_FOUND and
 * cost the customer the bag they already had. So every case also says which
 * requests reached the backend: the cookie goes only after the cart has been
 * asked about and CONFIRMED gone.
 */

const jar = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    values,
    store: {
      get: (name: string) => (values.has(name) ? { name, value: values.get(name) } : undefined),
      set: (name: string, value: string) => values.set(name, value),
      delete: (name: string) => values.delete(name),
    },
  };
});

vi.mock('next/headers', () => ({ cookies: () => Promise.resolve(jar.store) }));

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

beforeEach(() => {
  jar.values.clear();
});

/** The cart a create answers with — never the one a stale cookie named. */
const FRESH_CART = cartIdSchema.parse('00000000-0000-4000-8000-00000000ca02');

/** A stock add naming the line fixture's product in its one size. */
const STOCK_ADD = addToBagRequestSchema.parse({
  productId: STOCK_LINE.productId,
  selections: STOCK_LINE.pieces.map(({ pieceId, sizeId }) => ({ pieceId, sizeId })),
  quantity: 1,
});

const ADDED = { kind: 'ADDED', summary: BAG_WITH_LINE } as const;

const created = () => HttpResponse.json({ id: FRESH_CART }, { status: 201 });
const added = () => HttpResponse.json(ADDED, { status: 201 });
const noSuchCart = () => new HttpResponse(null, { status: 404 });

describe('addForCustomer', () => {
  it.each([
    ['a product or sizes it will not take', { kind: 'SELECTION_REFUSED' }],
    ['measurements it will not cut to', { kind: 'MEASUREMENTS_REFUSED' }],
  ] as const)('keeps the cart cookie when the add is refused for %s', async (_l, refusal) => {
    const received: Sent[] = [];
    jar.values.set(CART_COOKIE_NAME, CART_ID);
    server.use(
      http.post(
        `*${ENDPOINTS.bag.items(CART_ID)}`,
        recordInto(received, () => HttpResponse.json(refusal)),
      ),
    );

    const result = await addForCustomer(STOCK_ADD, 'en');

    expect(result).toEqual({ ok: true, value: refusal });
    expect(jar.values.get(CART_COOKIE_NAME)).toBe(CART_ID);
    expect(trail(received)).toEqual([`POST ${ENDPOINTS.bag.items(CART_ID)}`]);
  });

  it('forwards the visitor headers on the add, and on the retry after a replaced cart (M-03)', async () => {
    const seen: Array<string | null> = [];
    const visitor = {
      'x-visitor-id': '00000000-0000-4000-8000-0000000000aa',
      'x-visitor-device': 'mobile',
    };
    const note = (request: Request) => seen.push(request.headers.get('x-visitor-id'));
    jar.values.set(CART_COOKIE_NAME, CART_ID);
    server.use(
      http.post(`*${ENDPOINTS.bag.items(CART_ID)}`, ({ request }) => {
        note(request);
        return noSuchCart();
      }),
      http.head(`*${ENDPOINTS.bag.cart(CART_ID)}`, noSuchCart),
      http.post(`*${ENDPOINTS.bag.summary}`, created),
      http.post(`*${ENDPOINTS.bag.items(FRESH_CART)}`, ({ request }) => {
        note(request);
        return added();
      }),
    );

    await addForCustomer(STOCK_ADD, 'en', undefined, visitor);

    expect(seen).toEqual([visitor['x-visitor-id'], visitor['x-visitor-id']]);
  });

  it('replaces a cookie naming a cart the backend no longer has, once it says so, and adds', async () => {
    const received: Sent[] = [];
    jar.values.set(CART_COOKIE_NAME, CART_ID);
    server.use(
      http.post(`*${ENDPOINTS.bag.items(CART_ID)}`, recordInto(received, noSuchCart)),
      http.head(`*${ENDPOINTS.bag.cart(CART_ID)}`, recordInto(received, noSuchCart)),
      http.post(`*${ENDPOINTS.bag.summary}`, recordInto(received, created)),
      http.post(`*${ENDPOINTS.bag.items(FRESH_CART)}`, recordInto(received, added)),
    );

    const result = await addForCustomer(STOCK_ADD, 'en');

    expect(result).toEqual({ ok: true, value: ADDED });
    expect(jar.values.get(CART_COOKIE_NAME)).toBe(FRESH_CART);
    expect(trail(received)).toEqual([
      `POST ${ENDPOINTS.bag.items(CART_ID)}`,
      `HEAD ${ENDPOINTS.bag.cart(CART_ID)}`,
      `POST ${ENDPOINTS.bag.summary}`,
      `POST ${ENDPOINTS.bag.items(FRESH_CART)}`,
    ]);
  });

  /* A plain REST 404 on the add — a product withdrawn a moment ago, say — for a
     cart that is still there. The cart is asked about first, and survives. */
  it('keeps a live cart when an add answers 404 for some other reason', async () => {
    const received: Sent[] = [];
    jar.values.set(CART_COOKIE_NAME, CART_ID);
    server.use(
      http.post(`*${ENDPOINTS.bag.items(CART_ID)}`, recordInto(received, noSuchCart)),
      http.head(
        `*${ENDPOINTS.bag.cart(CART_ID)}`,
        recordInto(received, () => new HttpResponse(null, { status: 200 })),
      ),
    );

    const result = await addForCustomer(STOCK_ADD, 'en');

    expect(result).toMatchObject({ ok: false, error: { kind: 'NOT_FOUND' } });
    expect(jar.values.get(CART_COOKIE_NAME)).toBe(CART_ID);
    expect(trail(received)).toEqual([
      `POST ${ENDPOINTS.bag.items(CART_ID)}`,
      `HEAD ${ENDPOINTS.bag.cart(CART_ID)}`,
    ]);
  });

  /* BUG-01 — a one-piece unstitched length has no size set (§6.1), so its add names
     no size; the backend resolves the piece's key (§7.1 step 1). It used to be refused
     on this side. From a browser with no bag yet, so the add takes the cart it made. */
  it('sends an add naming no size, for a product with none to choose, into a new cart', async () => {
    const received: Sent[] = [];
    const add = addToBagRequestSchema.parse({
      productId: STOCK_LINE.productId,
      selections: [],
      quantity: 1,
    });
    server.use(
      http.post(`*${ENDPOINTS.bag.summary}`, recordInto(received, created)),
      http.post(`*${ENDPOINTS.bag.items(FRESH_CART)}`, recordInto(received, added)),
    );

    const result = await addForCustomer(add, 'en');

    expect(result).toEqual({ ok: true, value: ADDED });
    expect(jar.values.get(CART_COOKIE_NAME)).toBe(FRESH_CART);
    expect(received.at(-1)).toMatchObject({ locale: 'en', body: { selections: [] } });
  });

  it('treats a cookie that is not a cart id as no cookie at all', async () => {
    jar.values.set(CART_COOKIE_NAME, '../../account/orders');

    expect(await readCartId()).toBeNull();
  });
});
