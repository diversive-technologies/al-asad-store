import { ROUTES } from '@/config/routes';
import { err, ok, type Result } from '@/lib/result';
import type { z } from 'zod';

import { classifyOrderResponse } from '../lib/order-read';

import {
  checkoutQuoteSchema,
  orderSchema,
  placeOrderResultSchema,
  type CheckoutQuote,
  type Order,
  type PlaceOrderRequest,
  type PlaceOrderResult,
} from '../schemas/checkout.schema';

/**
 * The browser side of §17: our own BFF, never Java directly.
 *
 * No cart id crosses this boundary — the BFF attaches it from the httpOnly
 * cookie, exactly as the bag's calls do (SEC-01).
 */

export interface CheckoutError {
  kind: 'UNAVAILABLE';
}

const FAILED: Result<never, CheckoutError> = err({ kind: 'UNAVAILABLE' });

/** ERR-05(1) / ERR-01 — one place where a rejected `fetch` becomes a value. */
async function send<TSchema extends z.ZodType>(
  url: string,
  schema: TSchema,
  init: RequestInit = {},
): Promise<Result<z.infer<TSchema>, CheckoutError>> {
  const response = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init.headers },
  }).then<Response | null, null>(
    (result) => result,
    () => null,
  );

  if (response === null || !response.ok) return FAILED;

  const payload: unknown = await response.json().then<unknown, null>(
    (value: unknown) => value,
    () => null,
  );

  // DATA-02: our own route is a network boundary like any other.
  const parsed = schema.safeParse(payload);
  return parsed.success ? ok(parsed.data) : FAILED;
}

/** §17 `quote`. Re-read whenever delivery or gifting changes the total. */
export function fetchQuote(
  deliveryOptionId: string,
  isGift: boolean,
  signal?: AbortSignal,
): Promise<Result<CheckoutQuote, CheckoutError>> {
  const url = new URL(ROUTES.api.checkoutQuote, window.location.origin);
  url.searchParams.set('deliveryOptionId', deliveryOptionId);
  url.searchParams.set('isGift', String(isGift));

  return send(url.toString(), checkoutQuoteSchema, signal ? { signal } : {});
}

/**
 * §7.2. Resolves to `PRICE_CHANGED` or `RESERVATION_EXPIRED` as VALUES — those
 * are the transaction working, not the request failing.
 */
export function placeOrder(
  request: PlaceOrderRequest,
): Promise<Result<PlaceOrderResult, CheckoutError>> {
  return send(ROUTES.api.checkoutPlace, placeOrderResultSchema, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * §28.3 `getOrder(orderNumber)` — a guest returning to their order.
 *
 * Deliberately NOT built on `send`, and the difference is the entire point.
 * `send` answers `FAILED` for every non-ok response, which folds "no order has
 * this number" into "the read failed" — the exact collapse that made a dead
 * mock layer read as a missing order and sent a customer holding a receipt
 * looking for a mistake they had not made.
 *
 * So absence stays in the SUCCESS channel as `null`, which is the shape
 * `fetchProduct` already uses for a withdrawn product, and the error channel
 * carries transport and contract failure only. The caller can then tell the
 * two apart, which is what `OrderScreen` does.
 */
export async function fetchOrderByNumber(
  orderNumber: string,
  signal?: AbortSignal,
): Promise<Result<Order | null, CheckoutError>> {
  // ERR-05(1): a rejected `fetch` becomes a value here rather than propagating.
  const response = await fetch(ROUTES.api.checkoutOrder(orderNumber), {
    headers: { Accept: 'application/json' },
    ...(signal ? { signal } : {}),
  }).then<Response | null, null>(
    (result) => result,
    () => null,
  );

  const outcome = classifyOrderResponse(response === null ? null : response.status);

  if (outcome === 'FAILED') return FAILED;
  if (outcome === 'ABSENT') return ok(null);

  const payload: unknown = await response?.json().then<unknown, null>(
    (value: unknown) => value,
    () => null,
  );

  // DATA-02: validated, not trusted — our own route is still a boundary.
  const parsed = orderSchema.safeParse(payload);
  return parsed.success ? ok(parsed.data) : FAILED;
}
