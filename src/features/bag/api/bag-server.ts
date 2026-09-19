import 'server-only';

import { z } from 'zod';

import type { Locale } from '@/i18n/locales';
import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import { API_HEADERS } from '@/lib/api/headers';
import { cartIdSchema, type CartId, type CartLineId } from '@/lib/domain/ids';
import { ok, type Result } from '@/lib/result';

import {
  addToBagResultSchema,
  applyCodeResultSchema,
  moveToWishlistResultSchema,
  updateQuantityResultSchema,
  type AddToBagRequest,
  type AddToBagResult,
  type ApplyCodeResult,
  type MoveToWishlistResult,
  type UpdateQuantityResult,
} from '../schemas/bag-write.schema';
import { bagSummarySchema, type BagSummary } from '../schemas/bag.schema';

/**
 * DATA-04 — the server side of architecture §16.
 *
 * Every call takes the cart id explicitly rather than reading a cookie itself.
 * The cookie is the BFF's business (SEC-01: the cart id is a capability — hold
 * it and you hold the bag — so it is httpOnly and never reaches client JS), and
 * keeping these functions parameterised means they are equally callable from a
 * Server Component rendering `/bag` and from a Route Handler.
 *
 * DATA-09 — caching intent is `revalidate: 0` on every one of them, reads
 * included. A bag is per-customer, holds live reservations with expiry times,
 * and is wrong the moment it is a second old; there is no cacheable read here.
 */

const createdCartSchema = z.object({ id: cartIdSchema });

/** Issues a new cart. Called once, on the first add, by the BFF. */
export function createCart(): Promise<Result<{ id: CartId }, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.bag.summary,
    schema: createdCartSchema,
    method: 'POST',
    body: {},
    next: { revalidate: 0 },
  });
}

/**
 * Whether the backend still holds this cart as a bag — `true`, `false`, or an
 * error when it could not say.
 *
 * A HEAD: nothing is priced and no lapsed line is settled. It exists so the BFF
 * can CONFIRM a cart is gone before it throws the cookie naming it away, rather
 * than inferring that from a 404 on some other request.
 */
export async function isCartLive(cartId: CartId): Promise<Result<boolean, ApiError>> {
  const result = await apiRequest({
    path: ENDPOINTS.bag.cart(cartId),
    schema: z.null(),
    method: 'HEAD',
    next: { revalidate: 0 },
  });

  if (result.ok) return ok(true);
  return result.error.kind === 'NOT_FOUND' ? ok(false) : result;
}

/** §16 `summary(cart)`. */
export function fetchBagSummary(
  cartId: CartId,
  locale: Locale,
): Promise<Result<BagSummary, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.bag.cart(cartId),
    schema: bagSummarySchema,
    searchParams: { locale },
    next: { revalidate: 0 },
  });
}

/** §16 `addItem(cart, product_id, {piece_id -> size}, qty)`. */
export function addItem(
  cartId: CartId,
  request: AddToBagRequest,
  locale: Locale,
  /**
   * §34 — whose measurements a made-to-measure add may name, resolved from the
   * session or the device cookie on THIS side.
   *
   * The same header §34.4's own routes attach, and for the same reason: the
   * profile id travels in the body, so the owner must not. Absent for a stock
   * add, which names no profile.
   */
  measurementOwner?: string,
): Promise<Result<AddToBagResult, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.bag.items(cartId),
    schema: addToBagResultSchema,
    method: 'POST',
    body: request,
    headers:
      measurementOwner === undefined ? {} : { [API_HEADERS.measurementOwner]: measurementOwner },
    searchParams: { locale },
    next: { revalidate: 0 },
  });
}

/** §16 `updateQuantity(cart, line, qty)`. */
export function updateQuantity(
  cartId: CartId,
  lineId: CartLineId,
  quantity: number,
  locale: Locale,
): Promise<Result<UpdateQuantityResult, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.bag.line(cartId, lineId),
    schema: updateQuantityResultSchema,
    method: 'PATCH',
    body: { quantity },
    searchParams: { locale },
    next: { revalidate: 0 },
  });
}

/**
 * §16 `removeItem(cart, line)` — the hold is released by the backend at once.
 *
 * D6: a POST that RECORDS the removal, not a DELETE. The line stops being in
 * the bag and stays on file with the reason it left.
 */
export function removeItem(
  cartId: CartId,
  lineId: CartLineId,
  locale: Locale,
): Promise<Result<UpdateQuantityResult, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.bag.lineRemoval(cartId, lineId),
    schema: updateQuantityResultSchema,
    method: 'POST',
    body: {},
    searchParams: { locale },
    next: { revalidate: 0 },
  });
}

/**
 * §16 `moveToWishlist(cart, line)` — the line leaves the bag and its product joins
 * the account's saved items, in one backend step.
 *
 * `accountKey` is read from the SESSION by the caller and attached as the same
 * header the saved items travel under (`API_HEADERS.accountKey`); nothing in the
 * request the browser sent can name whose list it is.
 */
export function moveToWishlist(
  cartId: CartId,
  lineId: CartLineId,
  accountKey: string,
  locale: Locale,
): Promise<Result<MoveToWishlistResult, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.bag.lineWishlistMove(cartId, lineId),
    schema: moveToWishlistResultSchema,
    method: 'POST',
    body: {},
    headers: { [API_HEADERS.accountKey]: accountKey },
    searchParams: { locale },
    next: { revalidate: 0 },
  });
}

/** §16 `applyCode(cart, code)`. */
export function applyCode(
  cartId: CartId,
  code: string,
  locale: Locale,
): Promise<Result<ApplyCodeResult, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.bag.code(cartId),
    schema: applyCodeResultSchema,
    method: 'POST',
    body: { code },
    searchParams: { locale },
    next: { revalidate: 0 },
  });
}

/**
 * Lifting a code again is its own call, not `applyCode('')`.
 *
 * D6: recorded as lifted rather than erased, so the bag's history shows which
 * codes were tried and in what order.
 */
export function removeCode(
  cartId: CartId,
  locale: Locale,
): Promise<Result<ApplyCodeResult, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.bag.codeRemoval(cartId),
    schema: applyCodeResultSchema,
    method: 'POST',
    body: {},
    searchParams: { locale },
    next: { revalidate: 0 },
  });
}
