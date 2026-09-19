import { ROUTES } from '@/config/routes';
import { fetchWithContract } from '@/lib/api/browser-fetch';
import { err, ok, type Result } from '@/lib/result';
import type { CartLineId } from '@/lib/domain/ids';
import type { z } from 'zod';

import { EMPTY_BAG } from '../lib/empty-bag';
import type {
  AddToBagRequest,
  AddToBagResult,
  ApplyCodeResult,
  MoveToWishlistResult,
  UpdateQuantityResult,
} from '../schemas/bag-write.schema';
import type { BagSummary } from '../schemas/bag.schema';

/**
 * The browser side of §16: reads and writes our own BFF, never Java directly.
 *
 * Every call is credentialled by a cookie this code cannot see (SEC-01), so
 * none of these functions takes a cart id — "my bag" is the only bag a browser
 * can address.
 */

/*
 * Deliberate code split (IMP-01a, PERF-10). The bag is read on EVERY page, for
 * the header's count, so a static import of its schemas made Zod first-load
 * JavaScript on every route. A write's schemas arrive with the request, and it
 * is sent only once they are here (`fetchWithContract` has the reasoning); the
 * read fetches them only when there is a bag to parse (`fetchBag`).
 */
const loadSchemas = () =>
  Promise.all([import('../schemas/bag.schema'), import('../schemas/bag-write.schema')]).then(
    ([read, write]) => ({ ...read, ...write }),
  );

type BagSchemas = Awaited<ReturnType<typeof loadSchemas>>;

/** What the bag's BFF answers a browser that has no bag: there is no body to read. */
const NO_BAG = 204;

export interface BagError {
  /**
   * `SIGNED_OUT` — the route needs an account and the session has none, which
   * only the move into saved items asks for. Kept apart from `UNAVAILABLE`,
   * because "try again" is the wrong advice to someone whose session ended.
   */
  kind: 'UNAVAILABLE' | 'SIGNED_OUT';
}

const FAILED: Result<never, BagError> = err({ kind: 'UNAVAILABLE' });

/**
 * ERR-05(1) / ERR-01 — one place where a rejected `fetch` becomes a value.
 *
 * Every bag call has the same shape: send, survive a transport failure, then
 * validate the body against a schema (DATA-02 — our own route is a network
 * boundary like any other). The schema is named by a selector because the
 * schemas arrive with the request rather than with the page. Schemas that could
 * not be downloaded fail the call like any other transport failure — and a write
 * is then never sent, so a second press cannot add twice what the first added.
 */
async function send<TSchema extends z.ZodType>(
  url: string,
  schemaOf: (schemas: BagSchemas) => TSchema,
  init: RequestInit = {},
): Promise<Result<z.infer<TSchema>, BagError>> {
  const [response, schemas] = await fetchWithContract(
    url,
    {
      ...init,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init.headers },
    },
    loadSchemas,
  );

  if (response?.status === 401) return err({ kind: 'SIGNED_OUT' });
  if (response === null || !response.ok || schemas === null) return FAILED;

  return bodyOf(response, schemaOf(schemas));
}

/** The body, held to its schema (DATA-02); an unreadable or malformed one fails the call. */
async function bodyOf<TSchema extends z.ZodType>(
  response: Response,
  schema: TSchema,
): Promise<Result<z.infer<TSchema>, BagError>> {
  const payload: unknown = await response.json().then<unknown, null>(
    (value: unknown) => value,
    () => null,
  );

  const parsed = schema.safeParse(payload);
  return parsed.success ? ok(parsed.data) : FAILED;
}

/**
 * §16 `summary(cart)` — the header's count, asked for on every page.
 *
 * Unlike the writes, it fetches the schemas only once there is a bag to parse.
 * A browser that has never added anything is answered `204` with no body — the
 * BFF knows there is no cart without asking Java — and that is the empty bag,
 * so a visit that only browses never downloads Zod at all (PERF-10). With a
 * bag, the schemas follow the response rather than travelling beside it: the
 * first read on a page waits for them once, and every call after finds them
 * already here.
 */
export async function fetchBag(signal?: AbortSignal): Promise<Result<BagSummary, BagError>> {
  const response = await fetch(ROUTES.api.bag, {
    signal: signal ?? null,
    headers: { Accept: 'application/json' },
  }).then<Response | null, null>(
    (result) => result,
    () => null,
  );

  if (response === null || !response.ok) return FAILED;
  if (response.status === NO_BAG) return ok(EMPTY_BAG);

  const schemas = await loadSchemas().then<BagSchemas | null, null>(
    (loaded) => loaded,
    () => null,
  );
  return schemas === null ? FAILED : bodyOf(response, schemas.bagSummarySchema);
}

/** §16 `addItem`. Resolves to `UNAVAILABLE` as a VALUE, not a rejection (§7.1). */
export function addToBag(request: AddToBagRequest): Promise<Result<AddToBagResult, BagError>> {
  return send(ROUTES.api.bag, (schemas) => schemas.addToBagResultSchema, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/** §16 `updateQuantity`. Raising can still come back `UNAVAILABLE`. */
export function updateLineQuantity(
  lineId: CartLineId,
  quantity: number,
): Promise<Result<UpdateQuantityResult, BagError>> {
  return send(ROUTES.api.bagLine(lineId), (schemas) => schemas.updateQuantityResultSchema, {
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
export function removeBagLine(lineId: CartLineId): Promise<Result<UpdateQuantityResult, BagError>> {
  return send(ROUTES.api.bagLineRemoval(lineId), (schemas) => schemas.updateQuantityResultSchema, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/**
 * §16 `moveToWishlist` — the line leaves the bag and its product joins the saved
 * items of whoever is signed in; the BFF reads who that is from the session.
 */
export function moveBagLineToWishlist(
  lineId: CartLineId,
): Promise<Result<MoveToWishlistResult, BagError>> {
  return send(
    ROUTES.api.bagLineWishlistMove(lineId),
    (schemas) => schemas.moveToWishlistResultSchema,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
}

/** §16 `applyCode`. A refused code resolves to `REJECTED`, carrying the reason. */
export function applyBagCode(code: string): Promise<Result<ApplyCodeResult, BagError>> {
  return send(ROUTES.api.bagCode, (schemas) => schemas.applyCodeResultSchema, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

/** D6 — lifting a code is recorded, not erased. See `removeBagLine`. */
export function removeBagCode(): Promise<Result<ApplyCodeResult, BagError>> {
  return send(ROUTES.api.bagCodeRemoval, (schemas) => schemas.applyCodeResultSchema, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
