import { ROUTES } from '@/config/routes';
import { err, ok, type Result } from '@/lib/result';
import type { CartLineId } from '@/lib/domain/ids';
import type { z } from 'zod';

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
 * The browser side of §16: reads and writes our own BFF, never Java directly.
 *
 * Every call is credentialled by a cookie this code cannot see (SEC-01), so
 * none of these functions takes a cart id — "my bag" is the only bag a browser
 * can address.
 */

export interface BagError {
  kind: 'UNAVAILABLE';
}

const FAILED: Result<never, BagError> = err({ kind: 'UNAVAILABLE' });

/**
 * ERR-05(1) / ERR-01 — one place where a rejected `fetch` becomes a value.
 *
 * Every bag call has the same shape: send, survive a transport failure, then
 * validate the body against a schema (DATA-02 — our own route is a network
 * boundary like any other).
 */
async function send<TSchema extends z.ZodType>(
  url: string,
  schema: TSchema,
  init: RequestInit = {},
): Promise<Result<z.infer<TSchema>, BagError>> {
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

  const parsed = schema.safeParse(payload);
  return parsed.success ? ok(parsed.data) : FAILED;
}

/** §16 `summary(cart)`. */
export function fetchBag(signal?: AbortSignal): Promise<Result<BagSummary, BagError>> {
  return send(ROUTES.api.bag, bagSummarySchema, signal ? { signal } : {});
}

/** §16 `addItem`. Resolves to `UNAVAILABLE` as a VALUE, not a rejection (§7.1). */
export function addToBag(request: AddToBagRequest): Promise<Result<AddToBagResult, BagError>> {
  return send(ROUTES.api.bag, addToBagResultSchema, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/** §16 `updateQuantity`. Raising can still come back `UNAVAILABLE`. */
export function updateLineQuantity(
  lineId: CartLineId,
  quantity: number,
): Promise<Result<AddToBagResult, BagError>> {
  return send(ROUTES.api.bagLine(lineId), addToBagResultSchema, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  });
}

/**
 * §16 `removeItem` — always succeeds, and releases the hold at once.
 *
 * D6: a POST that records the removal. Nothing in this application issues a
 * DELETE, because nothing in this system is destroyed.
 */
export function removeBagLine(lineId: CartLineId): Promise<Result<AddToBagResult, BagError>> {
  return send(ROUTES.api.bagLineRemoval(lineId), addToBagResultSchema, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** §16 `applyCode`. A refused code resolves to `REJECTED`, carrying the reason. */
export function applyBagCode(code: string): Promise<Result<ApplyCodeResult, BagError>> {
  return send(ROUTES.api.bagCode, applyCodeResultSchema, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

/** D6 — lifting a code is recorded, not erased. See `removeBagLine`. */
export function removeBagCode(): Promise<Result<ApplyCodeResult, BagError>> {
  return send(ROUTES.api.bagCodeRemoval, applyCodeResultSchema, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
