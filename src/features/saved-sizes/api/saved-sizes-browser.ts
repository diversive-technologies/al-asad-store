import { ROUTES } from '@/config/routes';
import { fetchWithContract } from '@/lib/api/browser-fetch';
import type { SizeId } from '@/lib/domain/ids';
import { err, ok, type Result } from '@/lib/result';

import type { SavedSizes } from '../schemas/saved-size.schema';

/*
 * Deliberate code split (IMP-01a, PERF-10). The saved sizes are offered from
 * every card's quick-add tray and listed on the account page, so a static import
 * of their schema made Zod first-load JavaScript wherever a card or that list is
 * drawn. It arrives with the request instead (`fetchWithContract` has the
 * reasoning).
 */
const loadSchema = () => import('../schemas/saved-size.schema');

export interface SavedSizesError {
  /**
   * `SIGNED_OUT` — the session has ended, so retrying cannot work until the
   * customer signs in again. `GONE` — the size is not what the page thinks: a
   * size the store no longer offers on a save, or a size that is no longer the
   * current one on a forget (changed in another tab). Both are told apart from an
   * ordinary failure because the customer can act on them.
   */
  readonly kind: 'UNREACHABLE' | 'SIGNED_OUT' | 'GONE';
}

/**
 * The browser side of §28.3's saved sizes: our own BFF, never Java directly.
 *
 * DATA-02 — the BFF is a network boundary like any other, so its answer is PARSED
 * rather than cast. ERR-05(1) / ERR-01 — a rejected fetch becomes a value.
 */
async function call(path: string, init: RequestInit): Promise<Result<SavedSizes, SavedSizesError>> {
  const [response, contract] = await fetchWithContract(
    path,
    { ...init, headers: { Accept: 'application/json', ...init.headers } },
    loadSchema,
  );

  if (response === null) return err({ kind: 'UNREACHABLE' });
  if (response.status === 401) return err({ kind: 'SIGNED_OUT' });
  if (response.status === 404) return err({ kind: 'GONE' });
  if (!response.ok || contract === null) return err({ kind: 'UNREACHABLE' });

  const payload: unknown = await response.json().then<unknown, null>(
    (value: unknown) => value,
    () => null,
  );

  const parsed = contract.savedSizesSchema.safeParse(payload);
  return parsed.success ? ok(parsed.data) : err({ kind: 'UNREACHABLE' });
}

const asJson = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export function readSavedSizes(signal?: AbortSignal): Promise<Result<SavedSizes, SavedSizesError>> {
  return call(ROUTES.api.savedSizes, { method: 'GET', signal: signal ?? null });
}

/** Remembers a size; the answer is the account's whole list. */
export function postSavedSize(sizeId: SizeId): Promise<Result<SavedSizes, SavedSizesError>> {
  return call(ROUTES.api.savedSizes, asJson({ sizeId }));
}

/** D6 — the forgetting is recorded; the size it undoes stays on file. */
export function postSavedSizeRemoval(sizeId: SizeId): Promise<Result<SavedSizes, SavedSizesError>> {
  return call(ROUTES.api.savedSizeRemoval, asJson({ sizeId }));
}
