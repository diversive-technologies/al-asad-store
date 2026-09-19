import { ROUTES } from '@/config/routes';
import { fetchWithContract } from '@/lib/api/browser-fetch';
import { err, ok, type Result } from '@/lib/result';
import type { z } from 'zod';

import { classifyReadResponse } from '../lib/read-outcome';

import type { CheckoutQuote, Order } from '../schemas/checkout.schema';
import type { OrderLookupRequest } from '../schemas/order-lookup.schema';
import type { PlaceOrderRequest, PlaceOrderResult } from '../schemas/place-order.schema';

/*
 * Deliberate code split (IMP-01a, PERF-10): a static import of these schemas
 * made Zod first-load JavaScript on the checkout and order pages, where the page
 * could not hydrate until it had arrived. They arrive with the request
 * instead (`fetchWithContract` has the reasoning).
 */
const loadSchemas = () =>
  Promise.all([import('../schemas/checkout.schema'), import('../schemas/place-order.schema')]).then(
    ([checkout, placing]) => ({ ...checkout, ...placing }),
  );

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

/**
 * Why a placement came back with no answer to show — two different facts, kept
 * apart (ERR-02), because only one of them lets the page say nothing was placed.
 *
 * - `NOT_PLACED` — refused with an answer that says so, by the BFF or by the
 *   backend behind it (a 4xx): this request placed nothing.
 * - `UNCONFIRMED` — no answer this side can read: the request may never have
 *   arrived, or §7.2 may have committed before its reply was lost (steps 7 and 8
 *   run after the commit, and a timeout or a reply that fails its contract comes
 *   back the same way). Nothing here may say either way.
 */
export interface PlaceOrderError {
  kind: 'NOT_PLACED' | 'UNCONFIRMED';
}

const NOT_PLACED: Result<never, PlaceOrderError> = err({ kind: 'NOT_PLACED' });
const UNCONFIRMED: Result<never, PlaceOrderError> = err({ kind: 'UNCONFIRMED' });

/**
 * §17 `quote`. Re-read whenever delivery or gifting changes the total.
 * `deliveryOptionId` null names no option: the backend prices its default and
 * says which that is.
 *
 * `null` is "there is nothing to check out" — the BFF answers 404 for a browser
 * with no cart and for a cart with nothing left in it. It is kept in the SUCCESS
 * channel for the reason the order read keeps absence there: this used to go
 * through `send`, which folds every non-ok answer into one failure, so a store
 * that could not be reached told a customer holding a full bag that it was empty.
 */
export async function fetchQuote(
  deliveryOptionId: string | null,
  isGift: boolean,
  signal?: AbortSignal,
): Promise<Result<CheckoutQuote | null, CheckoutError>> {
  const url = new URL(ROUTES.api.checkoutQuote, window.location.origin);
  if (deliveryOptionId !== null) url.searchParams.set('deliveryOptionId', deliveryOptionId);
  url.searchParams.set('isGift', String(isGift));

  // ERR-05(1): a rejected `fetch` becomes a value here rather than propagating.
  const [response, schemas] = await fetchWithContract(
    url.toString(),
    { headers: { Accept: 'application/json' }, ...(signal ? { signal } : {}) },
    loadSchemas,
  );

  return optionalBody(response, schemas?.checkoutQuoteSchema ?? null);
}

/**
 * §7.2. Resolves to `PRICE_CHANGED` or `RESERVATION_EXPIRED` as VALUES — those
 * are the transaction working, not the request failing — and fails only as one
 * of `PlaceOrderError`'s two facts.
 */
export async function placeOrder(
  request: PlaceOrderRequest,
): Promise<Result<PlaceOrderResult, PlaceOrderError>> {
  // ERR-05(1): a rejected `fetch` becomes a value here rather than propagating.
  const [response, schemas] = await fetchWithContract(
    ROUTES.api.checkoutPlace,
    {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
    loadSchemas,
  );

  if (response !== null && response.status >= 400 && response.status < 500) return NOT_PLACED;
  if (response === null || !response.ok || schemas === null) return UNCONFIRMED;

  const payload: unknown = await response.json().then<unknown, null>(
    (value: unknown) => value,
    () => null,
  );

  // DATA-02: our own route is a network boundary like any other. A 200 that does
  // not parse is an answer nobody can read — which may be a placed order.
  const parsed = schemas.placeOrderResultSchema.safeParse(payload);
  return parsed.success ? ok(parsed.data) : UNCONFIRMED;
}

/**
 * What a response MEANS for a read whose answer may be "nothing here" — an order
 * this browser may not see, or a bag with nothing to quote.
 *
 * Deliberately NOT `send`, and the difference is the entire point. `send` answers
 * `FAILED` for every non-ok response, which folds "nothing here" into "the read
 * failed" — the exact collapse that made a dead mock layer read as a missing order
 * and sent a customer holding a receipt looking for a mistake they had not made.
 * So absence stays in the SUCCESS channel as `null`, and the error channel carries
 * transport and contract failure only (`classifyReadResponse`). A schema that
 * could not be downloaded (`null`) fails a read that has a body to check.
 */
async function optionalBody<TSchema extends z.ZodType>(
  response: Response | null,
  schema: TSchema | null,
): Promise<Result<z.infer<TSchema> | null, CheckoutError>> {
  const outcome = classifyReadResponse(response === null ? null : response.status);

  if (outcome === 'FAILED') return FAILED;
  if (outcome === 'ABSENT') return ok(null);
  if (schema === null) return FAILED;

  const payload: unknown = await response?.json().then<unknown, null>(
    (value: unknown) => value,
    () => null,
  );

  // DATA-02: validated, not trusted — our own route is still a boundary.
  const parsed = schema.safeParse(payload);
  return parsed.success ? ok(parsed.data) : FAILED;
}

/**
 * §28.3 `getOrder(orderNumber)` — an order, read back by whoever this browser is.
 *
 * `null` means there is no order this browser may see under that number: none
 * exists, or nothing here shows who placed it. The two are deliberately the same
 * answer, and the page then asks for the order's mobile number.
 */
export async function fetchOrderByNumber(
  orderNumber: string,
  signal?: AbortSignal,
): Promise<Result<Order | null, CheckoutError>> {
  // ERR-05(1): a rejected `fetch` becomes a value here rather than propagating.
  const [response, schemas] = await fetchWithContract(
    ROUTES.api.checkoutOrder(orderNumber),
    { headers: { Accept: 'application/json' }, ...(signal ? { signal } : {}) },
    loadSchemas,
  );

  return optionalBody(response, schemas?.orderSchema ?? null);
}

/**
 * §28.3's lookup "by number and mobile". The mobile goes to the BFF in a POST
 * body and is compared by the backend; `null` is "no order matches", whether the
 * number or the mobile was the reason.
 */
export async function lookUpOrder(
  orderNumber: string,
  request: OrderLookupRequest,
): Promise<Result<Order | null, CheckoutError>> {
  const [response, schemas] = await fetchWithContract(
    ROUTES.api.checkoutOrderLookup(orderNumber),
    {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
    loadSchemas,
  );

  return optionalBody(response, schemas?.orderSchema ?? null);
}
