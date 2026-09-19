import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/config/routes';

import { checkoutQuoteQuery } from './checkout-quote-query';

/**
 * TEST-08 — F5: changing the delivery option re-keys the quote, and the query
 * went back to pending — so the checkout screen swapped its whole form for a
 * loading line and focus fell to the page on every re-quote. The quote on screen
 * now stays, marked as a placeholder, until the new one lands.
 *
 * TEST-04: the BFF is mocked at the HTTP layer, so the real reader runs.
 */

const ORIGIN = 'http://store.test';

/** A quote priced with whichever option was asked for, the default when none was. */
function quoteFor(deliveryOptionId: string | null) {
  const chosen = deliveryOptionId ?? 'standard';
  const deliveryMinor = chosen === 'express' ? 60_000 : 25_000;
  return {
    totals: {
      subtotalMinor: 700_000,
      discountMinor: 0,
      deliveryMinor,
      giftMinor: 0,
      totalMinor: 700_000 + deliveryMinor,
    },
    deliveryOptionId: chosen,
    deliveryOptions: [
      { id: 'standard', label: 'Standard', description: '3 to 5 days', chargeMinor: 25_000 },
      { id: 'express', label: 'Express', description: '1 to 2 days', chargeMinor: 60_000 },
    ],
    paymentMethods: [
      {
        id: 'cod',
        label: 'Cash',
        description: 'On arrival',
        isAvailable: true,
        unavailableReason: null,
      },
    ],
    gift: { isOffered: true, chargeMinor: 30_000 },
    madeToMeasure: { isPresent: false, leadTimeDays: 0, hasOtherItems: true },
  };
}

const server = setupServer(
  http.get(`${ORIGIN}${ROUTES.api.checkoutQuote}`, ({ request }) =>
    HttpResponse.json(quoteFor(new URL(request.url).searchParams.get('deliveryOptionId'))),
  ),
);

beforeAll(() => {
  vi.stubGlobal('window', { location: { origin: ORIGIN } });
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});

describe('the checkout quote while it is re-read', () => {
  it('keeps the previous quote on screen, marked, instead of going back to pending', async () => {
    const observer = new QueryObserver(new QueryClient(), checkoutQuoteQuery(null, false));
    const unsubscribe = observer.subscribe(() => undefined);
    await vi.waitFor(() => {
      expect(observer.getCurrentResult().data?.deliveryOptionId).toBe('standard');
    });

    observer.setOptions(checkoutQuoteQuery('express', false));
    const requoting = observer.getCurrentResult();

    expect(requoting.isPending).toBe(false);
    expect(requoting.isPlaceholderData).toBe(true);
    expect(requoting.data?.deliveryOptionId).toBe('standard');

    await vi.waitFor(() => {
      expect(observer.getCurrentResult().data?.deliveryOptionId).toBe('express');
    });
    expect(observer.getCurrentResult().isPlaceholderData).toBe(false);
    unsubscribe();
  });
});
