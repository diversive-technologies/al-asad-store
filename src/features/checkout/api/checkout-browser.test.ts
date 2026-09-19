import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/config/routes';

import { fetchQuote, placeOrder } from './checkout-browser';

/**
 * TEST-08 — BUG-10: with the store unreachable, `/checkout` said "There is
 * nothing to check out — your bag is empty" to a customer holding a full bag.
 * The quote read folded every unhappy answer into one failure, and the screen
 * read that one failure as an empty bag.
 *
 * TEST-04: the BFF is mocked at the HTTP layer, so the real reader and its
 * schema validation run.
 */

const ORIGIN = 'http://store.test';
const QUOTE_URL = `${ORIGIN}${ROUTES.api.checkoutQuote}`;
const PLACE_URL = `${ORIGIN}${ROUTES.api.checkoutPlace}`;

const QUOTE = {
  totals: {
    subtotalMinor: 700_000,
    discountMinor: 0,
    deliveryMinor: 25_000,
    giftMinor: 0,
    totalMinor: 725_000,
  },
  deliveryOptionId: 'standard',
  deliveryOptions: [
    { id: 'standard', label: 'Standard', description: '3 to 5 days', chargeMinor: 25_000 },
  ],
  paymentMethods: [
    {
      id: 'cod',
      label: 'Cash on delivery',
      description: 'Pay the courier',
      isAvailable: true,
      unavailableReason: null,
    },
  ],
  gift: { isOffered: true, chargeMinor: 30_000 },
  madeToMeasure: { isPresent: false, leadTimeDays: 0, hasOtherItems: true },
};

const server = setupServer();

beforeAll(() => {
  vi.stubGlobal('window', { location: { origin: ORIGIN } });
  // The interceptor resolves the placement's relative address against `location`.
  vi.stubGlobal('location', { href: `${ORIGIN}/checkout` });
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});

describe('fetchQuote', () => {
  it('reads a quote', async () => {
    server.use(http.get(QUOTE_URL, () => HttpResponse.json(QUOTE)));

    const result = await fetchQuote('standard', false);
    expect(result.ok && result.value?.totals.totalMinor).toBe(725_000);
  });

  it('names no option until one is chosen, and reads which the backend priced', async () => {
    const asked: (string | null)[] = [];
    server.use(
      http.get(QUOTE_URL, ({ request }) => {
        asked.push(new URL(request.url).searchParams.get('deliveryOptionId'));
        return HttpResponse.json(QUOTE);
      }),
    );

    const result = await fetchQuote(null, false);

    expect(asked).toEqual([null]);
    expect(result.ok && result.value?.deliveryOptionId).toBe('standard');
  });

  it('refuses a quote priced with an option it does not offer', async () => {
    server.use(http.get(QUOTE_URL, () => HttpResponse.json({ ...QUOTE, deliveryOptionId: 'x' })));

    await expect(fetchQuote(null, false)).resolves.toEqual({
      ok: false,
      error: { kind: 'UNAVAILABLE' },
    });
  });

  it('answers "nothing to check out" as a VALUE when the BFF says there is no bag', async () => {
    server.use(http.get(QUOTE_URL, () => new HttpResponse(null, { status: 404 })));

    await expect(fetchQuote('standard', false)).resolves.toEqual({ ok: true, value: null });
  });

  it.each([
    { label: 'the store unreachable', respond: () => new HttpResponse(null, { status: 502 }) },
    { label: 'the store broken', respond: () => new HttpResponse(null, { status: 500 }) },
    { label: 'a request that never completed', respond: () => HttpResponse.error() },
    { label: 'a body that is not a quote', respond: () => HttpResponse.json({ totals: 'no' }) },
  ])('reports $label as a failure, never as an empty bag', async ({ respond }) => {
    server.use(http.get(QUOTE_URL, respond));

    await expect(fetchQuote('standard', false)).resolves.toEqual({
      ok: false,
      error: { kind: 'UNAVAILABLE' },
    });
  });
});

/**
 * TEST-08 — F2: every failed placement used to say "We could not place your
 * order. Nothing has been charged", including a reply lost after §7.2 had
 * committed. Only an answered refusal is NOT_PLACED now; anything nobody can read
 * is UNCONFIRMED, because the order may exist.
 */
describe('placeOrder', () => {
  const REQUEST = {
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
  };

  it('reads a refusal §7.2 answered as a value', async () => {
    server.use(
      http.post(PLACE_URL, () =>
        HttpResponse.json({ kind: 'PRICE_CHANGED', totals: QUOTE.totals }),
      ),
    );

    const result = await placeOrder(REQUEST);
    expect(result.ok && result.value.kind).toBe('PRICE_CHANGED');
  });

  it.each([
    { label: 'nothing to place', status: 404 },
    { label: 'a request refused as malformed', status: 400 },
    { label: 'another origin', status: 403 },
  ])('says NOT_PLACED for $label, which was answered', async ({ status }) => {
    server.use(http.post(PLACE_URL, () => new HttpResponse(null, { status })));

    await expect(placeOrder(REQUEST)).resolves.toEqual({
      ok: false,
      error: { kind: 'NOT_PLACED' },
    });
  });

  it.each([
    { label: 'the store not answering', respond: () => new HttpResponse(null, { status: 502 }) },
    { label: 'a request that never completed', respond: () => HttpResponse.error() },
    { label: 'a reply nobody can read', respond: () => HttpResponse.json({ kind: 'PLACED' }) },
  ])('says UNCONFIRMED for $label, because the order may exist', async ({ respond }) => {
    server.use(http.post(PLACE_URL, respond));

    await expect(placeOrder(REQUEST)).resolves.toEqual({
      ok: false,
      error: { kind: 'UNCONFIRMED' },
    });
  });
});
