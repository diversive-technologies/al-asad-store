import { setupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ENDPOINTS } from '@/lib/api/endpoints';

import { addItem, createCart, resetCarts } from './bag-db';
import { resetReservations } from './bag-reservations';
import { CATALOGUE } from './catalogue-db';
import { DELIVERY_OPTIONS } from './checkout-config-db';
import { deliveryOptionFor, placeOrder, quoteFor, resetOrders } from './checkout-db';
import { handlers } from './handlers';
import { onHandFor } from './inventory-db';
import { toProductDetail } from './product-detail-db';

/**
 * TEST-08 — §3.1: the delivery options are the BACKEND's list, and so is the one
 * checkout opens on.
 *
 * The storefront used to open on an id it wrote itself, and the quote priced an
 * id it did not know as the first option while placement refused the same id as
 * NOT_FOUND — so a backend naming its options differently would have been
 * quoted a total for an order it would then never take.
 */

const UNKNOWN = 'not-an-option';

/** A cart holding one in-stock product. */
function stockedCart(): string {
  const record = CATALOGUE.find(
    (entry) =>
      entry.garmentType !== 'unstitched' &&
      toProductDetail(entry, 'en').pieces.every((piece) =>
        piece.sizes.some((size) => onHandFor(piece.id, size.id) > 0),
      ),
  );
  const selections = (record === undefined ? [] : toProductDetail(record, 'en').pieces).map(
    (piece) => ({
      pieceId: piece.id,
      sizeId: piece.sizes.find((size) => onHandFor(piece.id, size.id) > 0)?.id ?? '',
    }),
  );
  const cart = createCart();
  addItem(cart, record?.id ?? '', selections, 1, 'en');
  return cart;
}

const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterAll(() => {
  server.close();
});

beforeEach(() => {
  resetCarts();
  resetReservations();
  resetOrders();
});

describe('§17 quote — which delivery option it is priced with', () => {
  it('names no option, and is told the default it was priced with', () => {
    const quote = quoteFor(stockedCart(), 'en', null, false);

    expect(quote?.deliveryOptionId).toBe(deliveryOptionFor(null)?.id);
    expect(quote?.deliveryOptions.map((option) => option.id)).toContain(quote?.deliveryOptionId);
  });

  it.each(DELIVERY_OPTIONS.map((option) => [option.id]))('states %s when asked for it', (id) => {
    expect(quoteFor(stockedCart(), 'en', id, false)?.deliveryOptionId).toBe(id);
  });

  it('prices no total for an option the store does not offer', () => {
    expect(deliveryOptionFor(UNKNOWN)).toBeNull();
    expect(quoteFor(stockedCart(), 'en', UNKNOWN, false)).toBeNull();
  });

  it('answers an unknown option 400 — never the 404 that means "nothing to check out"', async () => {
    const cart = stockedCart();
    const url = new URL(ENDPOINTS.checkout.quote(cart), 'http://localhost:8080');

    const named = new URL(url);
    named.searchParams.set('deliveryOptionId', UNKNOWN);

    expect((await fetch(named)).status).toBe(400);
    expect((await fetch(url)).status).toBe(200);
  });

  it('places the order the default quote priced, on the option it named', () => {
    const cart = stockedCart();
    const quote = quoteFor(cart, 'en', null, false);

    const outcome = placeOrder(
      cart,
      {
        contactName: 'Test Customer',
        contactMobile: '03001234567',
        contactEmail: '',
        addressLine: '12 Example Street, Block A',
        addressCity: 'Lahore',
        deliveryOptionId: quote?.deliveryOptionId ?? '',
        paymentMethodId: 'card',
        isGift: false,
        giftMessage: '',
        expectedTotalMinor: quote?.totals.totalMinor ?? -1,
      },
      'en',
    );

    expect(outcome.kind).toBe('PLACED');
  });
});
