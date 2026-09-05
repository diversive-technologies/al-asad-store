import { ROUTES } from '@/config/routes';
import { err, ok, type Result } from '@/lib/result';
import type { z } from 'zod';

import {
  checkoutQuoteSchema,
  placeOrderResultSchema,
  type CheckoutQuote,
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
