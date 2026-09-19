import { setupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { clientKey } from '@/config/client';
import { addForCustomer, readCartId } from '@/features/bag';
import { addToBagRequestSchema } from '@/features/bag/contract';
import { orderNumberSchema, type OrderNumber } from '@/lib/domain/ids';
import { resetCarts } from '@/lib/mocks/bag-db';
import { resetReservations } from '@/lib/mocks/bag-reservations';
import { CATALOGUE } from '@/lib/mocks/catalogue-db';
import { resetOrders } from '@/lib/mocks/checkout-db';
import { handlers } from '@/lib/mocks/handlers';
import { onHandFor } from '@/lib/mocks/inventory-db';
import { resetOrderAccess } from '@/lib/mocks/order-access-db';
import { toProductDetail } from '@/lib/mocks/product-detail-db';

import { placeOrderRequestSchema } from '../schemas/place-order.schema';
import { fetchQuote } from './checkout-server';
import { lookUpOrderFor, placeForCustomer, readOrderFor } from './order-access';

/**
 * §28.3 — who may read an order back, end to end below the Route Handlers: the
 * real client, the real mock backend at the HTTP layer (TEST-04) and the real
 * cookies, with only the framework's cookie store replaced by a jar.
 *
 * Order numbers run in sequence. Before this, the number alone read the name,
 * mobile, address and measurements of any order anyone cared to count up to.
 */

const jar = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
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

const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterAll(() => {
  server.close();
});

beforeEach(() => {
  jar.values.clear();
  resetCarts();
  resetReservations();
  resetOrders();
  resetOrderAccess();
});

const MOBILE = '0300 1234567';

/** Places one stock order from this browser and answers its number and body. */
async function placeFromThisBrowser(accountKey: string | null) {
  const record = CATALOGUE.find((entry) =>
    toProductDetail(entry, 'en').pieces.every((piece) =>
      piece.sizes.some((size) => onHandFor(piece.id, size.id) > 0),
    ),
  );
  const pieces = record === undefined ? [] : toProductDetail(record, 'en').pieces;
  const selections = pieces.map((piece) => ({
    pieceId: piece.id,
    sizeId: piece.sizes.find((size) => onHandFor(piece.id, size.id) > 0)?.id,
  }));
  await addForCustomer(
    addToBagRequestSchema.parse({ productId: record?.id, selections, quantity: 1 }),
    'en',
  );

  const cartId = await readCartId();
  if (cartId === null) throw new Error('Expected a cart.');
  const quote = await fetchQuote(cartId, null, false, 'en');
  const request = placeOrderRequestSchema.parse({
    contactName: 'Test Customer',
    contactMobile: MOBILE,
    contactEmail: '',
    addressLine: '12 Example Street, Block A',
    addressCity: 'Lahore',
    deliveryOptionId: quote.ok ? quote.value.deliveryOptionId : '',
    paymentMethodId: 'cod',
    isGift: false,
    giftMessage: '',
    expectedTotalMinor: quote.ok ? quote.value.totals.totalMinor : -1,
  });

  const placed = await placeForCustomer(cartId, request, 'en', accountKey);
  if (!placed.ok || placed.value.kind !== 'PLACED') throw new Error('Expected a placed order.');
  return { number: placed.value.order.orderNumber, answer: placed.value };
}

function kindOf(result: { ok: boolean; error?: { kind: string } }): string {
  return result.ok ? 'OK' : (result.error?.kind ?? 'UNKNOWN');
}

describe('reading an order back', () => {
  it('opens the confirmation for the browser that placed it, with no token in the answer', async () => {
    const { number, answer } = await placeFromThisBrowser(null);

    expect(Object.keys(answer)).toEqual(['kind', 'order']);
    expect(kindOf(await readOrderFor(number, null))).toBe('OK');
  });

  it('refuses a browser holding no token, exactly as it refuses an unknown number', async () => {
    const { number } = await placeFromThisBrowser(null);
    jar.values.clear();

    expect(kindOf(await readOrderFor(number, null))).toBe('NOT_FOUND');
    expect(kindOf(await readOrderFor(orderNumberSchema.parse('AA999999'), null))).toBe('NOT_FOUND');
  });

  it.each([
    ['the account that placed it', 'customer@example.com', 'OK'],
    ['a different account', 'someone@example.com', 'NOT_FOUND'],
  ])('answers %s on another browser', async (_label, reader, expected) => {
    const { number } = await placeFromThisBrowser('customer@example.com');
    jar.values.clear();

    expect(kindOf(await readOrderFor(number, reader))).toBe(expected);
  });

  it('ignores an order number written into the cookie without its token', async () => {
    const { number } = await placeFromThisBrowser(null);
    jar.values.set(clientKey('orders'), `${number}.${crypto.randomUUID()}`);

    expect(kindOf(await readOrderFor(number, null))).toBe('NOT_FOUND');
  });
});

describe('§28.3 finding an order again by its mobile number', () => {
  async function placedElsewhere(): Promise<OrderNumber> {
    const { number } = await placeFromThisBrowser(null);
    jar.values.clear();
    return number;
  }

  it('answers a wrong mobile exactly as a number that names nothing', async () => {
    const number = await placedElsewhere();

    expect(kindOf(await lookUpOrderFor(number, { mobile: '03119876543' }))).toBe('NOT_FOUND');
    expect(
      kindOf(await lookUpOrderFor(orderNumberSchema.parse('AA999999'), { mobile: MOBILE })),
    ).toBe('NOT_FOUND');
  });

  it('opens the order for the right mobile, and keeps it open for this browser', async () => {
    const number = await placedElsewhere();

    expect(kindOf(await lookUpOrderFor(number, { mobile: '03001234567' }))).toBe('OK');
    expect(kindOf(await readOrderFor(number, null))).toBe('OK');
  });

  /*
   * TEST-08 — K5: a number typed in another case found the order, but the token
   * was kept under the backend's spelling only, so the address the customer used
   * asked for the mobile again on every reload.
   */
  it('keeps it open at the address it was asked at, spelt as the customer typed it', async () => {
    const number = await placedElsewhere();
    const typed = orderNumberSchema.parse(number.toLowerCase());

    expect(kindOf(await lookUpOrderFor(typed, { mobile: MOBILE }))).toBe('OK');
    expect(kindOf(await readOrderFor(typed, null))).toBe('OK');
    expect(kindOf(await readOrderFor(number, null))).toBe('OK');
  });
});
