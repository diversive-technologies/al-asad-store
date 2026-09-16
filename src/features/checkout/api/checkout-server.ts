import 'server-only';

import type { Locale } from '@/i18n/locales';
import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import { API_HEADERS } from '@/lib/api/headers';
import type { CartId } from '@/lib/domain/ids';
import type { Result } from '@/lib/result';

import {
  accountOrdersSchema,
  checkoutQuoteSchema,
  orderSchema,
  placeOrderResultSchema,
  type AccountOrders,
  type CheckoutQuote,
  type Order,
  type PlaceOrderRequest,
  type PlaceOrderResult,
} from '../schemas/checkout.schema';

/**
 * DATA-04 — the server side of architecture §17.
 *
 * DATA-09 — `revalidate: 0` on all three. A quote depends on live stock, a live
 * promotion and a cap the operator can change; an order is read once and then
 * changes state behind the customer's back as it is confirmed and dispatched.
 * Neither has a window over which a cached copy is safe.
 */

/** §17 `quote(cart, address, deliveryOption) -> {totals, availableMethods}`. */
export function fetchQuote(
  cartId: CartId,
  deliveryOptionId: string,
  isGift: boolean,
  locale: Locale,
): Promise<Result<CheckoutQuote, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.checkout.quote(cartId),
    schema: checkoutQuoteSchema,
    searchParams: { deliveryOptionId, isGift, locale },
    next: { revalidate: 0 },
  });
}

/**
 * §17 `place(...)`, which runs the §7.2 transaction.
 *
 * The result is a union, not a throw: an expired hold and a moved price are
 * outcomes the transaction is specified to produce, and both carry detail the
 * customer has to see (ERR-01).
 */
export function placeOrder(
  cartId: CartId,
  request: PlaceOrderRequest,
  locale: Locale,
  accountKey: string | null,
): Promise<Result<PlaceOrderResult, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.checkout.place(cartId),
    schema: placeOrderResultSchema,
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
 * §28.3 — the orders this customer has placed, newest first.
 *
 * DATA-09 — uncacheable: the owner travels in a header and Next's data cache is
 * keyed on the request, so a cached entry would be one customer's history served
 * to another.
 */
export function fetchAccountOrders(accountKey: string): Promise<Result<AccountOrders, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.account.orders,
    schema: accountOrdersSchema,
    headers: { [API_HEADERS.accountKey]: accountKey },
    next: { revalidate: 0 },
  });
}

/** §28.3 — a guest returns to their order by its number. */
export function fetchOrder(orderNumber: string): Promise<Result<Order, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.checkout.order(orderNumber),
    schema: orderSchema,
    next: { revalidate: 0 },
  });
}
