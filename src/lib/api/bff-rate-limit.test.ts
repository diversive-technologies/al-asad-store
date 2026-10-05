import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { CART_COOKIE_NAME } from '@/lib/utils/cookies';

import { POST as postBackInStock } from '../../../app/api/back-in-stock/route';
import { POST as postLookup } from '../../../app/api/checkout/order/[orderNumber]/lookup/route';
import { POST as postPlace } from '../../../app/api/checkout/place/route';

/**
 * F-09 — "the BFF passes 429 and Retry-After through to the browser unchanged",
 * for the three Route Handlers behind Java's limits that the browser calls: the
 * order lookup, placement, and Notify Me. The route runs for real; Java's answer
 * is chosen per test at the HTTP layer (TEST-04).
 */

const CART_ID = '00000000-0000-4000-8000-0000000000c0';

const jar = vi.hoisted(() => new Map<string, string>());
vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
      set: (name: string, value: string) => jar.set(name, value),
      delete: (name: string) => jar.delete(name),
    }),
  headers: () => Promise.resolve(new Headers()),
}));

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
  jar.clear();
});
afterAll(() => {
  server.close();
});

const tooMany = (retryAfter?: string) => () =>
  new HttpResponse(null, {
    status: 429,
    headers: retryAfter === undefined ? {} : { 'Retry-After': retryAfter },
  });

function post(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('order lookup', () => {
  const lookup = () =>
    postLookup(
      post('http://store.test/api/checkout/order/AA100001/lookup', { mobile: '03001234567' }),
      {
        params: Promise.resolve({ orderNumber: 'AA100001' }),
      },
    );

  it('answers 429 with Java’s Retry-After', async () => {
    server.use(http.post('*/api/v1/orders/AA100001/lookups', tooMany('300')));

    const response = await lookup();

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('300');
  });

  it('answers 429 without a figure when Java sent none', async () => {
    server.use(http.post('*/api/v1/orders/AA100001/lookups', tooMany()));

    const response = await lookup();

    expect(response.status).toBe(429);
    expect(response.headers.has('Retry-After')).toBe(false);
  });
});

describe('placement', () => {
  it('answers 429 with Java’s Retry-After rather than a 502, which reads as "the order may exist"', async () => {
    jar.set(CART_COOKIE_NAME, CART_ID);
    server.use(http.post(`*/api/v1/carts/${CART_ID}/checkout/place`, tooMany('600')));

    const response = await postPlace(
      post('http://store.test/api/checkout/place', {
        contactName: 'Test Customer',
        contactMobile: '03001234567',
        contactEmail: '',
        addressLine: '12 Example Street, Block A',
        addressCity: 'Lahore',
        deliveryOptionId: 'standard',
        paymentMethodId: 'cod',
        isGift: false,
        giftMessage: '',
        expectedTotalMinor: 725_000,
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('600');
  });
});

describe('Notify Me', () => {
  it('answers 429 with Java’s Retry-After', async () => {
    server.use(http.post('*/api/v1/back-in-stock/requests', tooMany('3600')));

    const response = await postBackInStock(
      post('http://store.test/api/back-in-stock', {
        productId: '00000000-0000-4000-8000-00000000b001',
        pieceId: null,
        sizeId: '00000000-0000-4000-8000-00000000b003',
        email: 'someone@example.com',
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('3600');
  });
});

/** Keeps the shape of the answer honest for anything else Java may refuse with. */
describe('other failures are unchanged', () => {
  it('still answers 502 for a Notify Me request Java failed on', async () => {
    server.use(
      http.post('*/api/v1/back-in-stock/requests', () => HttpResponse.json({}, { status: 500 })),
    );

    const response = await postBackInStock(
      post('http://store.test/api/back-in-stock', {
        productId: '00000000-0000-4000-8000-00000000b001',
        pieceId: null,
        sizeId: '00000000-0000-4000-8000-00000000b003',
        email: 'someone@example.com',
      }),
    );

    expect(response.status).toBe(502);
  });
});
