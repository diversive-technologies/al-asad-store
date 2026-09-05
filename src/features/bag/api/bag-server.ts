import 'server-only';

import { z } from 'zod';

import type { Locale } from '@/i18n/locales';
import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import { cartIdSchema, type CartId, type CartLineId } from '@/lib/domain/ids';
import type { Result } from '@/lib/result';

import {
  addToBagResultSchema,
  applyCodeResultSchema,
  bagSummarySchema,
  type AddToBagRequest,
  type AddToBagResult,
  type ApplyCodeResult,
  type BagSummary,
} from '../schemas/bag.schema';

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
): Promise<Result<AddToBagResult, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.bag.items(cartId),
    schema: addToBagResultSchema,
    method: 'POST',
    body: request,
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
): Promise<Result<AddToBagResult, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.bag.line(cartId, lineId),
    schema: addToBagResultSchema,
    method: 'PATCH',
    body: { quantity },
    searchParams: { locale },
    next: { revalidate: 0 },
  });
}

/** §16 `removeItem(cart, line)` — the hold is released by the backend at once. */
export function removeItem(
  cartId: CartId,
  lineId: CartLineId,
  locale: Locale,
): Promise<Result<AddToBagResult, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.bag.line(cartId, lineId),
    schema: addToBagResultSchema,
    method: 'DELETE',
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

/** Lifting a code again is its own call, not `applyCode('')`. */
export function removeCode(
  cartId: CartId,
  locale: Locale,
): Promise<Result<ApplyCodeResult, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.bag.code(cartId),
    schema: applyCodeResultSchema,
    method: 'DELETE',
    searchParams: { locale },
    next: { revalidate: 0 },
  });
}
