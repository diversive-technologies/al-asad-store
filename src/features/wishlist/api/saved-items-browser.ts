import { ROUTES } from '@/config/routes';
import { fetchWithContract } from '@/lib/api/browser-fetch';
import { err, ok, type Result } from '@/lib/result';

import type { SavedItems } from '../schemas/saved-items.schema';

/*
 * Deliberate code split (IMP-01a, PERF-10). A signed-in customer's saved list
 * is read on every page, by the provider in the root layout that carries a
 * browser's list into the account, so a static import of its schema made Zod
 * first-load JavaScript on every route. It arrives with the request instead
 * (`fetchWithContract` has the reasoning).
 */
const loadSchema = () => import('../schemas/saved-items.schema');

export interface SavedItemsError {
  /** `SIGNED_OUT` — there is no account to hold a list; the browser keeps its own. */
  readonly kind: 'UNREACHABLE' | 'SIGNED_OUT';
}

/**
 * The browser side of §28.3's saved items: our own BFF, never Java directly.
 *
 * DATA-02 — the BFF is a network boundary like any other, so its answer is
 * PARSED rather than cast, and a body that does not match the contract is a
 * failure rather than a list of whatever arrived.
 *
 * ERR-05(1) / ERR-01 — a rejected fetch becomes a value; no try/catch for flow.
 */
async function call(path: string, init: RequestInit): Promise<Result<SavedItems, SavedItemsError>> {
  const [response, contract] = await fetchWithContract(
    path,
    { ...init, headers: { Accept: 'application/json', ...init.headers } },
    loadSchema,
  );

  if (response === null) return err({ kind: 'UNREACHABLE' });
  if (response.status === 401) return err({ kind: 'SIGNED_OUT' });
  if (!response.ok || contract === null) return err({ kind: 'UNREACHABLE' });

  const payload: unknown = await response.json().then<unknown, null>(
    (value: unknown) => value,
    () => null,
  );

  const parsed = contract.savedItemsSchema.safeParse(payload);
  return parsed.success ? ok(parsed.data) : err({ kind: 'UNREACHABLE' });
}

export function readSavedItems(signal?: AbortSignal): Promise<Result<SavedItems, SavedItemsError>> {
  return call(ROUTES.api.savedItems, { method: 'GET', signal: signal ?? null });
}

export function postSavedItems(
  productIds: readonly string[],
): Promise<Result<SavedItems, SavedItemsError>> {
  return call(ROUTES.api.savedItems, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productIds }),
  });
}

/** D6 — the removal is recorded; the row and its date stay on file. */
export function postSavedItemRemoval(
  productIds: readonly string[],
): Promise<Result<SavedItems, SavedItemsError>> {
  return call(ROUTES.api.savedItemRemoval, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productIds }),
  });
}
