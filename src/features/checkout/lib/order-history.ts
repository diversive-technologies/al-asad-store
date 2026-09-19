import { ROUTES } from '@/config/routes';

import {
  ACCOUNT_ORDERS_PAGE_MAX,
  orderHistoryCursorSchema,
  type AccountOrdersPage,
} from '../schemas/account-orders.schema';

/**
 * MOD-04 — which orders `/account` shows, read from its address, and where "Show
 * more" goes.
 *
 * The page works WITHOUT client JavaScript, so "Show more" is a link rather than
 * a button that appends rows: the address says how many orders are shown, and the
 * server renders that many in ONE request. That keeps every row ever shown on the
 * page to `ACCOUNT_ORDERS_PAGE_MAX` (PERF-03). Past it, the link moves the window
 * on to the cursor the backend gave, and the page offers a way back to the newest.
 */

/** How many more orders one press of "Show more" adds. */
export const ORDER_HISTORY_STEP = 20;

/** The section, and each row by its place in the window, as link targets. */
export const ORDER_HISTORY_SECTION_ID = 'account-orders';
export const orderHistoryRowId = (position: number): string => `account-order-${String(position)}`;

export interface OrderHistoryView {
  /** How many orders are shown: a multiple of the step, up to the page maximum. */
  readonly shown: number;
  /** The cursor the shown window starts after; `null` starts at the newest order. */
  readonly after: string | null;
}

/** The address's two values, untrusted and possibly repeated (SEC-02). */
export interface OrderHistoryParams {
  readonly orders: string | string[] | undefined;
  readonly ordersAfter: string | string[] | undefined;
}

export type OrderHistoryLink =
  /** More of this window: `firstNew` is the position of the first row it adds. */
  | { readonly kind: 'MORE'; readonly href: string; readonly firstNew: number }
  /** The window is full, so the next one starts where the backend said. */
  | { readonly kind: 'OLDER'; readonly href: string };

const single = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

/** Total: anything unreadable is the first page, never an error (SEC-02). */
export function parseOrderHistoryView(params: OrderHistoryParams): OrderHistoryView {
  const rawShown = single(params.orders) ?? '';
  const shown = /^\d{1,4}$/.test(rawShown) ? Number.parseInt(rawShown, 10) : ORDER_HISTORY_STEP;
  const isStep =
    shown >= ORDER_HISTORY_STEP &&
    shown <= ACCOUNT_ORDERS_PAGE_MAX &&
    shown % ORDER_HISTORY_STEP === 0;

  const after = orderHistoryCursorSchema.safeParse(single(params.ordersAfter));
  return { shown: isStep ? shown : ORDER_HISTORY_STEP, after: after.success ? after.data : null };
}

/** The one request a view needs. */
export function orderHistoryPage(view: OrderHistoryView): AccountOrdersPage {
  return { limit: view.shown, cursor: view.after };
}

/** Where "Show more" goes from a view, or `null` when the oldest order is on the page. */
export function nextOrderHistoryLink(
  view: OrderHistoryView,
  nextCursor: string | null,
): OrderHistoryLink | null {
  if (nextCursor === null) return null;

  if (view.shown < ACCOUNT_ORDERS_PAGE_MAX) {
    const shown = view.shown + ORDER_HISTORY_STEP;
    const firstNew = view.shown + 1;
    const query = { orders: shown, ordersAfter: view.after };
    return { kind: 'MORE', href: ROUTES.accountWith(query, orderHistoryRowId(firstNew)), firstNew };
  }

  const query = { orders: null, ordersAfter: nextCursor };
  return { kind: 'OLDER', href: ROUTES.accountWith(query, ORDER_HISTORY_SECTION_ID) };
}

/** Back to the newest orders, from a window that starts further back. */
export function latestOrdersHref(): string {
  return ROUTES.accountWith({ orders: null, ordersAfter: null }, ORDER_HISTORY_SECTION_ID);
}
