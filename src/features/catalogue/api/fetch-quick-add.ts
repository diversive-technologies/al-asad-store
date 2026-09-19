import { ROUTES } from '@/config/routes';
import { fetchWithContract } from '@/lib/api/browser-fetch';
import { err, ok, type Result } from '@/lib/result';

import type { QuickAddOfferPayload } from '../schemas/quick-add.schema';

/*
 * Deliberate code split (IMP-01a, PERF-10). Every product card carries a quick
 * add, so a static import of its schema made Zod first-load JavaScript on every
 * page with a card on it, for a read made only when a tray is opened. It arrives
 * beside the response instead (`fetchWithContract` has the reasoning).
 */
const loadSchema = () => import('../schemas/quick-add.schema');

/** The browser side of the card's quick add: our own BFF, never Java directly. */
export async function fetchQuickAdd(
  slug: string,
  signal?: AbortSignal,
): Promise<Result<QuickAddOfferPayload, { kind: 'UNAVAILABLE' }>> {
  const url = new URL(ROUTES.api.quickAdd, window.location.origin);
  url.searchParams.set('slug', slug);

  // ERR-05(1) / ERR-01: a rejection becomes a value; no try/catch for flow.
  const [response, contract] = await fetchWithContract(
    url,
    { signal: signal ?? null, headers: { Accept: 'application/json' } },
    loadSchema,
  );

  if (response === null || !response.ok || contract === null) return err({ kind: 'UNAVAILABLE' });

  const payload: unknown = await response.json().then<unknown, null>(
    (value: unknown) => value,
    () => null,
  );

  // DATA-02: our own route is a network boundary like any other.
  const parsed = contract.quickAddOfferSchema.safeParse(payload);
  return parsed.success ? ok(parsed.data) : err({ kind: 'UNAVAILABLE' });
}
