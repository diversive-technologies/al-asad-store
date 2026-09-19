import 'server-only';

import type { Locale } from '@/i18n/locales';
import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import { API_HEADERS } from '@/lib/api/headers';
import type { CartId, OrderAccessToken, OrderNumber } from '@/lib/domain/ids';
import type { Result } from '@/lib/result';

import {
  accountOrdersSchema,
  type AccountOrders,
  type AccountOrdersPage,
} from '../schemas/account-orders.schema';
import {
  checkoutQuoteSchema,
  orderSchema,
  type CheckoutQuote,
  type Order,
} from '../schemas/checkout.schema';
import {
  orderLookupReplySchema,
  type OrderLookupReply,
  type OrderLookupRequest,
} from '../schemas/order-lookup.schema';
import {
  placeOrderReplySchema,
  type PlaceOrderReply,
  type PlaceOrderRequest,
} from '../schemas/place-order.schema';

/**
 * DATA-04 — the server side of architecture §17.
 *
 * DATA-09 — `revalidate: 0` on every one. A quote depends on live stock, a live
 * promotion and a cap the operator can change; an order is read once and then
 * changes state behind the customer's back as it is confirmed and dispatched —
 * and whether it may be read at all depends on who is asking.
 */

/**
 * §17 `quote(cart, address, deliveryOption) -> {totals, availableMethods}`.
 * `deliveryOptionId` null names no option, and the backend prices its default.
 */
export function fetchQuote(
  cartId: CartId,
  deliveryOptionId: string | null,
  isGift: boolean,
  locale: Locale,
): Promise<Result<CheckoutQuote, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.checkout.quote(cartId),
    schema: checkoutQuoteSchema,
    searchParams: { deliveryOptionId: deliveryOptionId ?? undefined, isGift, locale },
    next: { revalidate: 0 },
  });
}

/**
 * §17 `place(...)`, which runs the §7.2 transaction.
 *
 * The result is a union, not a throw: an expired hold and a moved price are
 * outcomes the transaction is specified to produce, and both carry detail the
 * customer has to see (ERR-01). A placed order carries its access token, which
 * the BFF keeps and never forwards (`order-access.ts`).
 */
export function placeOrder(
  cartId: CartId,
  request: PlaceOrderRequest,
  locale: Locale,
  accountKey: string | null,
): Promise<Result<PlaceOrderReply, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.checkout.place(cartId),
    schema: placeOrderReplySchema,
    method: 'POST',
    body: request,
    /* WHOSE order it is, from the session on this side. §6.5 makes the customer
       nullable and §28.2 makes guest checkout scope, so no header is a guest
       rather than a refusal. */
    headers: accountKey === null ? {} : { [API_HEADERS.accountKey]: accountKey },
    searchParams: { locale },
    next: { revalidate: 0 },
  });
}

/**
 * §28.3 — one page of the orders this customer has placed, newest first.
 *
 * DATA-09 — uncacheable: the owner travels in a header and Next's data cache is
 * keyed on the request, so a cached entry would be one customer's history served
 * to another.
 */
export function fetchAccountOrders(
  accountKey: string,
  page: AccountOrdersPage,
): Promise<Result<AccountOrders, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.account.orders,
    schema: accountOrdersSchema,
    headers: { [API_HEADERS.accountKey]: accountKey },
    searchParams: { limit: page.limit, cursor: page.cursor ?? undefined },
    next: { revalidate: 0 },
  });
}

/** Who is asking to read an order — both from this side, never from a request body. */
export interface OrderReader {
  /** The signed-in account, from the session. */
  readonly accountKey: string | null;
  /** A token the backend issued this browser for the order, from its cookie. */
  readonly accessToken: OrderAccessToken | null;
}

/**
 * §28.3 — one order, for a reader who may see it. Anyone else gets a NOT_FOUND
 * identical to a number that names nothing, so this read cannot be used to learn
 * which numbers exist.
 */
export function fetchOrder(
  orderNumber: OrderNumber,
  reader: OrderReader,
): Promise<Result<Order, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.checkout.order(orderNumber),
    schema: orderSchema,
    headers: {
      ...(reader.accountKey === null ? {} : { [API_HEADERS.accountKey]: reader.accountKey }),
      ...(reader.accessToken === null ? {} : { [API_HEADERS.orderAccess]: reader.accessToken }),
    },
    next: { revalidate: 0 },
  });
}

/**
 * §28.3's guest lookup "by number and mobile". The backend compares the mobile;
 * a mismatch is the same NOT_FOUND an unknown number gets.
 */
export function lookupOrder(
  orderNumber: OrderNumber,
  request: OrderLookupRequest,
): Promise<Result<OrderLookupReply, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.checkout.orderLookup(orderNumber),
    schema: orderLookupReplySchema,
    method: 'POST',
    body: request,
    next: { revalidate: 0 },
  });
}
