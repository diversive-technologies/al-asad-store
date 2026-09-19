import { describe, expect, it } from 'vitest';

import { ACCOUNT_ORDERS_PAGE_MAX, accountOrdersSchema } from '../schemas/account-orders.schema';
import {
  nextOrderHistoryLink,
  ORDER_HISTORY_STEP,
  orderHistoryPage,
  parseOrderHistoryView,
} from './order-history';

/**
 * TEST-08 — fixNow 49: the order history came back as ONE list bounded at 500.
 * Past the bound the parse failed and the history read as "could not reach your
 * orders" for good; below it the page drew hundreds of rows (PERF-03). The
 * contract now pages, and `/account` shows a page at a time.
 */

const row = (sequence: number) => ({
  orderNumber: `AA${String(100_000 + sequence)}`,
  placedAt: '2026-09-17T10:00:00.000Z',
  totalMinor: 725_000,
  lineCount: 1,
  firstItem: 'Plain Waistcoat Suit',
});

describe('accountOrdersSchema', () => {
  it('accepts a full page with a cursor to the next one', () => {
    const page = {
      orders: Array.from({ length: ACCOUNT_ORDERS_PAGE_MAX }, (_, index) => row(index + 1)),
      nextCursor: 'AA100100',
    };

    expect(accountOrdersSchema.safeParse(page).success).toBe(true);
  });

  it.each([
    {
      label: 'more rows than a page may carry',
      orders: ACCOUNT_ORDERS_PAGE_MAX + 1,
      nextCursor: null,
    },
    { label: 'a cursor that could rewrite the address', orders: 1, nextCursor: '../orders?x=1' },
  ])('refuses $label', ({ orders, nextCursor }) => {
    const page = {
      orders: Array.from({ length: orders }, (_, index) => row(index + 1)),
      nextCursor,
    };

    expect(accountOrdersSchema.safeParse(page).success).toBe(false);
  });
});

describe('parseOrderHistoryView', () => {
  it.each([
    {
      label: 'no parameters',
      orders: undefined,
      ordersAfter: undefined,
      shown: ORDER_HISTORY_STEP,
      after: null,
    },
    { label: 'a larger step', orders: '60', ordersAfter: undefined, shown: 60, after: null },
    {
      label: 'a cursor',
      orders: undefined,
      ordersAfter: 'AA100080',
      shown: ORDER_HISTORY_STEP,
      after: 'AA100080',
    },
    {
      label: 'a count past the maximum',
      orders: '120',
      ordersAfter: undefined,
      shown: ORDER_HISTORY_STEP,
      after: null,
    },
    {
      label: 'a count off the step',
      orders: '25',
      ordersAfter: undefined,
      shown: ORDER_HISTORY_STEP,
      after: null,
    },
    {
      label: 'a count that is not a number',
      orders: '4e1',
      ordersAfter: undefined,
      shown: ORDER_HISTORY_STEP,
      after: null,
    },
    {
      label: 'a repeated parameter',
      orders: ['40', '80'],
      ordersAfter: undefined,
      shown: 40,
      after: null,
    },
    {
      label: 'a cursor that is not URL-safe',
      orders: undefined,
      ordersAfter: 'a/b',
      shown: ORDER_HISTORY_STEP,
      after: null,
    },
  ])('reads $label', ({ orders, ordersAfter, shown, after }) => {
    expect(parseOrderHistoryView({ orders, ordersAfter })).toEqual({ shown, after });
  });

  it('asks for exactly the orders the view shows, in one request', () => {
    expect(orderHistoryPage({ shown: 40, after: 'AA100080' })).toEqual({
      limit: 40,
      cursor: 'AA100080',
    });
  });
});

describe('nextOrderHistoryLink', () => {
  it('offers nothing once the oldest order is on the page', () => {
    expect(nextOrderHistoryLink({ shown: 20, after: null }, null)).toBeNull();
  });

  it('shows more of the same window, landing on the first row it adds', () => {
    expect(nextOrderHistoryLink({ shown: 20, after: null }, 'AA100081')).toEqual({
      kind: 'MORE',
      href: '/account?orders=40#account-order-21',
      firstNew: 21,
    });
  });

  it('keeps the window it is in', () => {
    expect(nextOrderHistoryLink({ shown: 40, after: 'AA100050' }, 'AA100010')).toEqual({
      kind: 'MORE',
      href: '/account?orders=60&ordersAfter=AA100050#account-order-41',
      firstNew: 41,
    });
  });

  it('moves on to the backend cursor rather than drawing more than a page', () => {
    expect(
      nextOrderHistoryLink({ shown: ACCOUNT_ORDERS_PAGE_MAX, after: null }, 'AA100050'),
    ).toEqual({
      kind: 'OLDER',
      href: '/account?ordersAfter=AA100050#account-orders',
    });
  });
});
