import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { clientKey } from '@/config/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import { API_HEADERS } from '@/lib/api/headers';
import { cartIdSchema, orderNumberSchema, type OrderNumber } from '@/lib/domain/ids';

import { ORDER, ORDER_NUMBER } from '../lib/test-fixtures';
import { placeOrderRequestSchema } from '../schemas/place-order.schema';
import { lookUpOrderFor, placeForCustomer, readOrderFor } from './order-access';

/**
 * §28.3 — who may read an order back, end to end below the Route Handlers: the
 * real client and the real cookies, against per-test handlers at the HTTP layer
 * (TEST-04), with only the framework's cookie store replaced by a jar.
 *
 * Order numbers run in sequence. Before this, the number alone read the name,
 * mobile, address and measurements of any order anyone cared to count up to.
 * Whether a reader may see an order is the backend's decision; what these pin is
 * this side's part of it — which token is kept, which is presented, and that
 * none ever reaches the browser. The handlers answer as §28.3 says the backend
 * does: the order for a reader it recognises, and a bare 404 for anyone else.
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

const CART_ID = cartIdSchema.parse('00000000-0000-4000-8000-0000000000c0');
const OWNER = 'customer@example.com';
const MOBILE = ORDER.contactMobile;

/* Tokens the backend issues — opaque to this side, and plainly not real ones. */
const PLACEMENT_TOKEN = 'placement-token-0001';
const LOOKUP_TOKEN = 'lookup-token-000000001';

/** The placement the checkout form sends, for the fixture order. */
const PLACEMENT = placeOrderRequestSchema.parse({
  contactName: ORDER.contactName,
  contactMobile: MOBILE,
  contactEmail: '',
  addressLine: ORDER.deliveryAddress,
  addressCity: ORDER.deliveryCity,
  deliveryOptionId: 'standard',
  paymentMethodId: 'cod',
  isGift: false,
  giftMessage: '',
  expectedTotalMinor: ORDER.totals.totalMinor,
});

const NOT_FOUND = () => new HttpResponse(null, { status: 404 });

/** §7.2 placement: the order, and beside it the token for reading it back. */
const placing = http.post(`*${ENDPOINTS.checkout.place(CART_ID)}`, () =>
  HttpResponse.json({ kind: 'PLACED', order: ORDER, accessToken: PLACEMENT_TOKEN }),
);

/**
 * The order read, at each address it is asked for: the order for the account
 * named, or for the token named, and the 404 an unknown number gets otherwise.
 */
function readableBy(
  reader: { readonly accountKey?: string; readonly token?: string },
  ...addresses: OrderNumber[]
) {
  return addresses.map((address) =>
    http.get(`*${ENDPOINTS.checkout.order(address)}`, ({ request }) => {
      const account = request.headers.get(API_HEADERS.accountKey);
      const token = request.headers.get(API_HEADERS.orderAccess);
      return account === reader.accountKey || token === reader.token
        ? HttpResponse.json(ORDER)
        : NOT_FOUND();
    }),
  );
}

/** §28.3's lookup: the order and a fresh token for the mobile it was placed with, sent in the body. */
function lookupAt(address: OrderNumber) {
  return http.post(`*${ENDPOINTS.checkout.orderLookup(address)}`, async ({ request }) =>
    (await request.text()) === JSON.stringify({ mobile: MOBILE })
      ? HttpResponse.json({ order: ORDER, accessToken: LOOKUP_TOKEN })
      : NOT_FOUND(),
  );
}

function kindOf(result: { ok: boolean; error?: { kind: string } }): string {
  return result.ok ? 'OK' : (result.error?.kind ?? 'UNKNOWN');
}

describe('reading an order back', () => {
  it('opens the confirmation for the browser that placed it, with no token in the answer', async () => {
    server.use(placing, ...readableBy({ token: PLACEMENT_TOKEN }, ORDER_NUMBER));

    const placed = await placeForCustomer(CART_ID, PLACEMENT, 'en', null);

    expect(placed).toEqual({ ok: true, value: { kind: 'PLACED', order: ORDER } });
    expect(JSON.stringify(placed)).not.toContain(PLACEMENT_TOKEN);
    expect(kindOf(await readOrderFor(ORDER_NUMBER, null))).toBe('OK');
  });

  it('refuses a browser holding no token: the number alone reads nothing', async () => {
    server.use(placing, ...readableBy({ token: PLACEMENT_TOKEN }, ORDER_NUMBER));
    await placeForCustomer(CART_ID, PLACEMENT, 'en', null);
    jar.values.clear();

    expect(kindOf(await readOrderFor(ORDER_NUMBER, null))).toBe('NOT_FOUND');
  });

  it.each([
    ['the account that placed it', OWNER, 'OK'],
    ['a different account', 'someone@example.com', 'NOT_FOUND'],
  ])('answers %s on another browser', async (_label, reader, expected) => {
    server.use(...readableBy({ accountKey: OWNER }, ORDER_NUMBER));

    expect(kindOf(await readOrderFor(ORDER_NUMBER, reader))).toBe(expected);
  });

  it('ignores an order number written into the cookie without its token', async () => {
    server.use(...readableBy({ token: PLACEMENT_TOKEN }, ORDER_NUMBER));
    jar.values.set(clientKey('orders'), `${ORDER_NUMBER}.not-the-issued-token`);

    expect(kindOf(await readOrderFor(ORDER_NUMBER, null))).toBe('NOT_FOUND');
  });
});

describe('§28.3 finding an order again by its mobile number', () => {
  it('passes a wrong mobile on as NOT_FOUND, and keeps nothing for this browser', async () => {
    server.use(lookupAt(ORDER_NUMBER), ...readableBy({ token: LOOKUP_TOKEN }, ORDER_NUMBER));

    expect(kindOf(await lookUpOrderFor(ORDER_NUMBER, { mobile: '03119876543' }))).toBe('NOT_FOUND');
    expect(kindOf(await readOrderFor(ORDER_NUMBER, null))).toBe('NOT_FOUND');
  });

  it('opens the order for the right mobile, and keeps it open for this browser', async () => {
    server.use(lookupAt(ORDER_NUMBER), ...readableBy({ token: LOOKUP_TOKEN }, ORDER_NUMBER));

    expect(kindOf(await lookUpOrderFor(ORDER_NUMBER, { mobile: MOBILE }))).toBe('OK');
    expect(kindOf(await readOrderFor(ORDER_NUMBER, null))).toBe('OK');
  });

  /*
   * TEST-08 — K5: a number typed in another case found the order, but the token
   * was kept under the backend's spelling only, so the address the customer used
   * asked for the mobile again on every reload.
   */
  it('keeps it open at the address it was asked at, spelt as the customer typed it', async () => {
    const typed = orderNumberSchema.parse(ORDER_NUMBER.toLowerCase());
    server.use(lookupAt(typed), ...readableBy({ token: LOOKUP_TOKEN }, typed, ORDER_NUMBER));

    expect(kindOf(await lookUpOrderFor(typed, { mobile: MOBILE }))).toBe('OK');
    expect(kindOf(await readOrderFor(typed, null))).toBe('OK');
    expect(kindOf(await readOrderFor(ORDER_NUMBER, null))).toBe('OK');
  });
});
