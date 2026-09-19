import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';
import { formatMoneyMinor } from '@/lib/utils/format';

import { orderSchema, type Order } from '../schemas/checkout.schema';
import { OrderPaymentDetails } from './OrderPaymentDetails';

/**
 * TEST-08 — fixNow 45: checkout offers bank transfer as "transfer the total to
 * our account", and the confirmation showed only the words "Bank transfer" — no
 * account, no amount, no reference. The order now carries where to pay, and this
 * pins that the confirmation says it.
 */

const TRANSFER = {
  reference: 'AA100001',
  bankName: 'Example Bank',
  accountTitle: 'Al-Asad Collections',
  accountNumber: '0000000000000000',
  iban: 'PK00EXMP0000000000000000',
};

function orderPaidBy(transferInstructions: typeof TRANSFER | null): Order {
  return orderSchema.parse({
    id: 'c1d2e3f4-0001-4c8a-8f21-000000000001',
    orderNumber: 'AA100001',
    state: 'AWAITING_PAYMENT',
    paymentState: transferInstructions === null ? 'AUTHORIZED' : 'AWAITING_TRANSFER',
    placedAt: '2026-09-17T10:00:00.000Z',
    contactName: 'Test Customer',
    contactMobile: '03001234567',
    deliveryAddress: '12 Example Street',
    deliveryCity: 'Lahore',
    deliveryLabel: 'Standard delivery',
    paymentLabel: transferInstructions === null ? 'Debit or credit card' : 'Bank transfer',
    isGift: false,
    giftMessage: '',
    lines: [
      {
        productId: 'b1b2c3d4-0001-4c8a-8f21-000000000001',
        productCode: 'AA-1001',
        productName: 'Plain Waistcoat Suit',
        quantity: 1,
        unitPriceMinor: 700_000,
        lineTotalMinor: 700_000,
        pieces: [{ pieceCode: 'W', name: 'Waistcoat', size: 'M' }],
        stitching: null,
      },
    ],
    totals: {
      subtotalMinor: 700_000,
      discountMinor: 0,
      deliveryMinor: 25_000,
      giftMinor: 0,
      totalMinor: 725_000,
    },
    transferInstructions,
  });
}

describe('OrderPaymentDetails', () => {
  it('names the account, the amount and the reference for a bank transfer', () => {
    const markup = renderToStaticMarkup(
      <OrderPaymentDetails order={orderPaidBy(TRANSFER)} locale="en" messages={en} />,
    );

    expect(markup).toContain(en.order.transferHeading);
    expect(markup).toContain(formatMoneyMinor(725_000, 'en'));
    // Every value an Urdu page would otherwise reorder is isolated.
    expect(markup).toContain(`<bdi>${TRANSFER.iban}</bdi>`);
    expect(markup).toContain(`<bdi>${TRANSFER.accountNumber}</bdi>`);
    expect(markup).toContain(`<bdi>${TRANSFER.accountTitle}</bdi>`);
    expect(markup).toContain(`<bdi>${TRANSFER.reference}</bdi>`);
  });

  it('draws no transfer instructions for an order that carries none', () => {
    const markup = renderToStaticMarkup(
      <OrderPaymentDetails order={orderPaidBy(null)} locale="en" messages={en} />,
    );

    expect(markup).toContain('Debit or credit card');
    expect(markup).not.toContain(en.order.transferHeading);
  });
});
