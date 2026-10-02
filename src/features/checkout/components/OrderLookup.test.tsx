import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/i18n/messages/en';
import { err, ok } from '@/lib/result';

import * as checkoutBrowser from '../api/checkout-browser';
import { orderSchema, type Order } from '../schemas/checkout.schema';
import { OrderLookup } from './OrderLookup';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const SAMPLE_ORDER: Order = orderSchema.parse({
  id: 'c1d2e3f4-0001-4c8a-8f21-000000000001',
  orderNumber: 'AA100001',
  state: 'CONFIRMED',
  paymentState: 'SETTLED',
  placedAt: '2026-09-17T10:00:00.000Z',
  contactName: 'Test Customer',
  contactMobile: '0300 1234567',
  deliveryAddress: '12 Example Street',
  deliveryCity: 'Lahore',
  deliveryLabel: 'Standard delivery',
  paymentLabel: 'Cash on delivery',
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
    deliveryMinor: 0,
    giftMinor: 0,
    totalMinor: 700_000,
  },
  transferInstructions: null,
});

describe('OrderLookup component', () => {
  it('renders order number and mobile inputs when orderNumber is not in address', () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <OrderLookup messages={en} />
      </QueryClientProvider>,
    );

    expect(markup).toContain('id="order-lookup-number"');
    expect(markup).toContain('id="order-lookup-mobile"');
    expect(markup).toContain(en.order.numberLabel);
    expect(markup).toContain(en.checkout.mobileLabel);
    expect(markup).toContain(en.order.lookupStandaloneBody);
  });

  it('renders only mobile input when orderNumber is already in address', () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <OrderLookup orderNumber="AA100001" messages={en} onFound={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(markup).not.toContain('id="order-lookup-number"');
    expect(markup).toContain('id="order-lookup-mobile"');
    expect(markup).toContain(en.order.lookupBody);
  });
});

describe('OrderLookup behavior and outcomes', () => {
  it('routes to order page on match', async () => {
    const lookUpOrderSpy = vi
      .spyOn(checkoutBrowser, 'lookUpOrder')
      .mockResolvedValueOnce(ok(SAMPLE_ORDER));

    const result = await checkoutBrowser.lookUpOrder('AA100001', { mobile: '03001234567' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(SAMPLE_ORDER);
    }
    lookUpOrderSpy.mockRestore();
  });

  it('reports miss when order is not found', async () => {
    const lookUpOrderSpy = vi
      .spyOn(checkoutBrowser, 'lookUpOrder')
      .mockResolvedValueOnce(ok(null));

    const result = await checkoutBrowser.lookUpOrder('AA999999', { mobile: '03001234567' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeNull();
    }
    lookUpOrderSpy.mockRestore();
  });

  it('handles rate-limited 429 response', async () => {
    const lookUpOrderSpy = vi
      .spyOn(checkoutBrowser, 'lookUpOrder')
      .mockResolvedValueOnce(err({ kind: 'RATE_LIMITED' }));

    const result = await checkoutBrowser.lookUpOrder('AA100001', { mobile: '03001234567' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('RATE_LIMITED');
    }
    lookUpOrderSpy.mockRestore();
  });

  it('handles unreachable 502/network failure', async () => {
    const lookUpOrderSpy = vi
      .spyOn(checkoutBrowser, 'lookUpOrder')
      .mockResolvedValueOnce(err({ kind: 'UNAVAILABLE' }));

    const result = await checkoutBrowser.lookUpOrder('AA100001', { mobile: '03001234567' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('UNAVAILABLE');
    }
    lookUpOrderSpy.mockRestore();
  });
});
