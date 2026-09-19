import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { en, type Messages } from '@/i18n/messages/en';

import { orderSchema } from '../schemas/checkout.schema';
import { OrderConfirmation } from './OrderConfirmation';
import { OrderLines } from './OrderLines';
import { OrderPaymentDetails } from './OrderPaymentDetails';

/**
 * TEST-08 — the order page's words and identifiers.
 *
 * I18N-06: every phrase is ONE message a translator owns — "× 2", the quoted
 * gift message and "Placed: {date}" used to be assembled in the components, so
 * their order and their marks could not be translated. The registry below is
 * bent on purpose: only a component that reads it shows the bent words.
 *
 * I18N-04: a mobile typed with a space reordered to "1234567 0300" in Urdu, and
 * the order number sat bare in a right-to-left paragraph.
 */

const BENT: Messages = {
  ...en,
  order: {
    ...en.order,
    quantityTimes: 'qty {count}',
    giftMessageQuoted: '<<{message}>>',
    placedOn: 'when: {date}',
  },
};

const ORDER = orderSchema.parse({
  id: 'c1d2e3f4-0001-4c8a-8f21-000000000001',
  orderNumber: 'AA100001',
  state: 'AWAITING_CONFIRMATION',
  paymentState: 'AWAITING_CONFIRMATION',
  placedAt: '2026-09-17T10:00:00.000Z',
  contactName: 'Test Customer',
  contactMobile: '0300 1234567',
  deliveryAddress: '12 Example Street',
  deliveryCity: 'Lahore',
  deliveryLabel: 'Standard delivery',
  paymentLabel: 'Cash on delivery',
  isGift: true,
  giftMessage: 'Eid Mubarak',
  lines: [
    {
      productId: 'b1b2c3d4-0001-4c8a-8f21-000000000001',
      productCode: 'AA-1001',
      productName: 'Plain Waistcoat Suit',
      quantity: 2,
      unitPriceMinor: 700_000,
      lineTotalMinor: 1_400_000,
      pieces: [{ pieceCode: 'W', name: 'Waistcoat', size: 'M' }],
      stitching: null,
    },
  ],
  totals: {
    subtotalMinor: 1_400_000,
    discountMinor: 0,
    deliveryMinor: 0,
    giftMinor: 30_000,
    totalMinor: 1_430_000,
  },
  transferInstructions: null,
});

describe('the order page', () => {
  it('says the quantity in the registry’s words', () => {
    const markup = renderToStaticMarkup(
      <OrderLines lines={ORDER.lines} locale="en" messages={BENT} />,
    );

    expect(markup).toContain('qty 2');
    expect(markup).not.toContain('× 2');
  });

  it('quotes the gift message the registry’s way', () => {
    const markup = renderToStaticMarkup(
      <OrderPaymentDetails order={ORDER} locale="en" messages={BENT} />,
    );

    expect(markup).toContain('&lt;&lt;Eid Mubarak&gt;&gt;');
  });

  describe('its confirmation', () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <OrderConfirmation order={ORDER} locale="en" messages={BENT} />
      </QueryClientProvider>,
    );

    it('says when it was placed in the registry’s words', () => {
      expect(markup).toContain('when: 17 September 2026');
    });

    it('isolates the order number and the mobile from a right-to-left page', () => {
      expect(markup).toContain('<bdi>AA100001</bdi>');
      expect(markup).toContain('<bdi>0300 1234567</bdi>');
    });

    it('gives the heading a place focus can land when a lookup finds the order', () => {
      expect(markup).toMatch(/<h1[^>]*tabindex="-1"[^>]*>Order placed<\/h1>/);
    });
  });
});
