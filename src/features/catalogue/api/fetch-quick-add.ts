import { ROUTES } from '@/config/routes';
import { err, ok, type Result } from '@/lib/result';

import { quickAddOfferSchema, type QuickAddOfferPayload } from '../schemas/quick-add.schema';

/** The browser side of the card's quick add: our own BFF, never Java directly. */
export async function fetchQuickAdd(
  slug: string,
  signal?: AbortSignal,
): Promise<Result<QuickAddOfferPayload, { kind: 'UNAVAILABLE' }>> {
  const url = new URL(ROUTES.api.quickAdd, window.location.origin);
  url.searchParams.set('slug', slug);

  // ERR-05(1) / ERR-01: the rejection becomes a value; no try/catch for flow.
  const response = await fetch(url, {
    signal: signal ?? null,
    headers: { Accept: 'application/json' },
  }).then<Response | null, null>(
    (result) => result,
    () => null,
  );

  if (response === null || !response.ok) return err({ kind: 'UNAVAILABLE' });

  const payload: unknown = await response.json().then<unknown, null>(
    (value: unknown) => value,
    () => null,
  );

  // DATA-02: our own route is a network boundary like any other.
  const parsed = quickAddOfferSchema.safeParse(payload);
  return parsed.success ? ok(parsed.data) : err({ kind: 'UNAVAILABLE' });
}
