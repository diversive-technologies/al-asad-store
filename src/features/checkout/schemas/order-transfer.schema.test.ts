import { beforeEach, describe, expect, it } from 'vitest';

import { addItem, createCart, resetCarts } from '@/lib/mocks/bag-db';
import { resetReservations } from '@/lib/mocks/bag-reservations';
import { placeOrder, quoteFor, resetOrders } from '@/lib/mocks/checkout-db';
import { availableKeys, stockedProduct } from '@/lib/mocks/stock-test-support';

import { placeOrderResultSchema } from './place-order.schema';

/**
 * The placed order's transfer instructions, held to the contract: what the mock
 * that stands in for Java places must be what `orderSchema` accepts, for the
 * method that carries instructions and for one that carries none.
 */

/** Places a one-product order with the given payment method, as the backend answers it. */
function placedWith(paymentMethodId: string): unknown {
  const record = stockedProduct('SET');
  const bySize = new Map(availableKeys(record).map((key) => [key.pieceId, key.sizeId]));
  const selections = [...bySize.entries()].map(([pieceId, sizeId]) => ({ pieceId, sizeId }));

  const cartId = createCart();
  addItem(cartId, record.id, selections, 1, 'en');
  const quote = quoteFor(cartId, 'en', 'standard', false);

  return placeOrder(
    cartId,
    {
      contactName: 'Test Customer',
      contactMobile: '03001234567',
      contactEmail: '',
      addressLine: '12 Example Street, Block A',
      addressCity: 'Lahore',
      deliveryOptionId: 'standard',
      paymentMethodId,
      isGift: false,
      giftMessage: '',
      expectedTotalMinor: quote?.totals.totalMinor ?? 0,
    },
    'en',
  );
}

beforeEach(() => {
  resetCarts();
  resetReservations();
  resetOrders();
});

describe('transfer instructions on a placed order', () => {
  it('parses a bank transfer with its reference being the order number', () => {
    const parsed = placeOrderResultSchema.safeParse(placedWith('bank'));

    expect(parsed.success).toBe(true);
    expect(parsed.data?.kind).toBe('PLACED');
    const order = parsed.data?.kind === 'PLACED' ? parsed.data.order : null;
    expect(order?.transferInstructions?.reference).toBe(order?.orderNumber);
  });

  it('parses a method with no instructions as null', () => {
    const parsed = placeOrderResultSchema.safeParse(placedWith('cod'));
    const order = parsed.data?.kind === 'PLACED' ? parsed.data.order : null;

    expect(parsed.success).toBe(true);
    expect(order?.transferInstructions).toBeNull();
  });

  it('refuses instructions that name no reference', () => {
    const placed = placedWith('bank');
    const parsed = placeOrderResultSchema.safeParse(placed);
    if (!parsed.success || parsed.data.kind !== 'PLACED')
      throw new Error('Expected a placed order.');

    const { transferInstructions } = parsed.data.order;
    const broken = {
      ...parsed.data,
      order: {
        ...parsed.data.order,
        transferInstructions: { ...transferInstructions, reference: '' },
      },
    };

    expect(placeOrderResultSchema.safeParse(broken).success).toBe(false);
  });
});
