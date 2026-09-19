import 'server-only';

import type { Locale } from '@/i18n/locales';
import type { ApiError } from '@/lib/api/errors';
import type { CartId, OrderNumber } from '@/lib/domain/ids';
import { ok, type Result } from '@/lib/result';

import type { Order } from '../schemas/checkout.schema';
import type { OrderLookupRequest } from '../schemas/order-lookup.schema';
import type { PlaceOrderRequest, PlaceOrderResult } from '../schemas/place-order.schema';
import { fetchOrder, lookupOrder, placeOrder } from './checkout-server';
import { accessTokenFor, rememberOrderAccess } from './order-access-cookie';

/**
 * §28.3 — reading an order back, for whoever may: the account that placed it, or
 * the browser holding a token the backend issued for it.
 *
 * An order's number runs in sequence, so it is an address and never a secret.
 * These three are the whole of how a token moves: kept when an order is placed,
 * kept when a lookup proves the order's mobile number, and presented on a read.
 * None of them ever hands a token to the browser.
 */

/**
 * §7.2 placement. The confirmation has to open the moment the order exists, so
 * the token the backend issued with it is kept BEFORE the browser is answered —
 * and stripped from that answer.
 */
export async function placeForCustomer(
  cartId: CartId,
  request: PlaceOrderRequest,
  locale: Locale,
  accountKey: string | null,
): Promise<Result<PlaceOrderResult, ApiError>> {
  const result = await placeOrder(cartId, request, locale, accountKey);
  if (!result.ok || result.value.kind !== 'PLACED') return result;

  const { accessToken, ...placed } = result.value;
  await rememberOrderAccess([placed.order.orderNumber], accessToken);
  return ok(placed);
}

/** One order, read with everything this side knows about who is asking. */
export async function readOrderFor(
  orderNumber: OrderNumber,
  accountKey: string | null,
): Promise<Result<Order, ApiError>> {
  return fetchOrder(orderNumber, { accountKey, accessToken: await accessTokenFor(orderNumber) });
}

/**
 * §28.3's lookup by mobile. A match keeps its fresh token, so the same browser
 * opens the order again without proving the mobile a second time.
 *
 * Kept under the number the backend answered with AND under the address it was
 * asked at, when the two are spelt differently (`aa100001` typed, AA100001
 * answered). Which spellings name one order is the backend's rule (DATA-13), so
 * this side never works that out; it remembers that this address opened the
 * order, and the address the customer used goes on opening it after a reload.
 */
export async function lookUpOrderFor(
  orderNumber: OrderNumber,
  request: OrderLookupRequest,
): Promise<Result<Order, ApiError>> {
  const result = await lookupOrder(orderNumber, request);
  if (!result.ok) return result;

  const { order, accessToken } = result.value;
  const addresses =
    order.orderNumber === orderNumber ? [order.orderNumber] : [orderNumber, order.orderNumber];
  await rememberOrderAccess(addresses, accessToken);
  return ok(order);
}
