import { beforeEach, describe, expect, it } from 'vitest';

import {
  nextOrderIdentity,
  ORDER_PAGE_MAX,
  orderHistoryPage,
  recordOrder,
  resetOrders,
  type OrderPayload,
} from './orders-db';

/**
 * fixNow 49 — the order history, a page at a time, as the mock that stands in
 * for Java serves it: newest first, by keyset, with the limit bounded.
 */

const ACCOUNT = 'pages@example.com';

function placeFor(accountKey: string | null): string {
  const { id, orderNumber } = nextOrderIdentity();
  const order: OrderPayload = {
    id,
    orderNumber,
    accountKey,
    state: 'CONFIRMED',
    paymentState: 'AUTHORIZED',
    placedAt: '2026-09-17T10:00:00.000Z',
    contactName: 'Test Customer',
    contactMobile: '03001234567',
    deliveryAddress: '12 Example Street',
    deliveryCity: 'Lahore',
    deliveryLabel: 'Standard delivery',
    paymentLabel: 'Debit or credit card',
    isGift: false,
    giftMessage: '',
    lines: [],
    totals: { subtotalMinor: 1, discountMinor: 0, deliveryMinor: 0, giftMinor: 0, totalMinor: 1 },
    transferInstructions: null,
  };
  recordOrder(order);
  return orderNumber;
}

const numbersOf = (page: ReturnType<typeof orderHistoryPage>) =>
  page?.orders.map((order) => order.orderNumber);

beforeEach(() => {
  resetOrders();
  // 25 orders for this account, with another customer's placed in between.
  Array.from({ length: 25 }, (_, index) => placeFor(index === 10 ? 'other@example.com' : ACCOUNT));
});

describe('orderHistoryPage', () => {
  it('serves the newest page and a cursor to the rest', () => {
    const first = orderHistoryPage(ACCOUNT, new URLSearchParams({ limit: '10' }));

    expect(first?.orders).toHaveLength(10);
    expect(numbersOf(first)?.[0]).toBe('AA100025');
    expect(first?.nextCursor).toBe('AA100016');
  });

  it('continues after the cursor without repeating or skipping a row', () => {
    const first = orderHistoryPage(ACCOUNT, new URLSearchParams({ limit: '10' }));
    const second = orderHistoryPage(
      ACCOUNT,
      new URLSearchParams({ limit: '10', cursor: 'AA100016' }),
    );
    const third = orderHistoryPage(
      ACCOUNT,
      new URLSearchParams({ limit: '10', cursor: 'AA100005' }),
    );

    // AA100011 is the other customer's, so it is on nobody's page here.
    expect(numbersOf(second)).toEqual([
      'AA100015',
      'AA100014',
      'AA100013',
      'AA100012',
      'AA100010',
      'AA100009',
      'AA100008',
      'AA100007',
      'AA100006',
      'AA100005',
    ]);
    expect(second?.nextCursor).toBe('AA100005');
    expect(numbersOf(third)).toEqual(['AA100004', 'AA100003', 'AA100002', 'AA100001']);
    expect(third?.nextCursor).toBeNull();
    expect(
      new Set([
        ...(numbersOf(first) ?? []),
        ...(numbersOf(second) ?? []),
        ...(numbersOf(third) ?? []),
      ]).size,
    ).toBe(24);
  });

  it('keeps a page steady when an order is placed while somebody pages', () => {
    placeFor(ACCOUNT);
    const second = orderHistoryPage(
      ACCOUNT,
      new URLSearchParams({ limit: '10', cursor: 'AA100016' }),
    );

    expect(numbersOf(second)?.[0]).toBe('AA100015');
  });

  it('serves the default page when no limit is asked for', () => {
    expect(orderHistoryPage(ACCOUNT, new URLSearchParams())?.orders).toHaveLength(20);
  });

  it.each([
    { label: 'a limit of zero', params: { limit: '0' } },
    { label: 'a limit past the maximum', params: { limit: String(ORDER_PAGE_MAX + 1) } },
    { label: 'a limit that is not whole', params: { limit: '2.5' } },
    { label: 'a limit written as an exponent', params: { limit: '1e1' } },
    { label: 'a cursor that is not an order number', params: { cursor: 'nope' } },
  ])('refuses $label', ({ params }) => {
    expect(orderHistoryPage(ACCOUNT, new URLSearchParams(params))).toBeNull();
  });
});
