import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import { err, ok, type Result } from '@/lib/result';

import { toSearchParams } from '../lib/search-params';
import { suggestionsSchema, type CatalogueQuery, type Suggestions } from '../schemas/search.schema';

/**
 * The browser side of the type-ahead: reads this application's own BFF route,
 * never the Java service directly.
 *
 * DATA-01 governs calls to the BACKEND and routes them through `apiRequest`.
 * That client is `server-only` by construction, which is precisely why the BFF
 * exists — so this is not a way around the rule, it is the other side of it.
 *
 * DATA-02 still applies in full: our own route is a network boundary like any
 * other, and its payload is parsed rather than trusted. A route returning the
 * wrong shape has to surface as a handled failure, not as `undefined` reaching
 * a component.
 */

/**
 * TS-06 — a discriminated union, not a boolean. The two failures want different
 * treatment: an unreachable route is expected and transient, while a shape
 * mismatch means our own BFF and our own schema disagree, which is a defect.
 */
export type SuggestionsError =
  { kind: 'UNAVAILABLE' } | { kind: 'CONTRACT_VIOLATION'; issues: string };

export async function fetchSuggestions(
  query: CatalogueQuery,
  locale: Locale,
  signal?: AbortSignal,
): Promise<Result<Suggestions, SuggestionsError>> {
  /*
   * The whole query travels, because the panel narrows in place: picking
   * "Boski" has to come back with fewer products, not send the reader to
   * another page. `toSearchParams` is the canonical serialiser the address bar
   * uses, so the panel asks the same question the results page would.
   */
  const url = new URL(ROUTES.api.suggest, window.location.origin);
  for (const [key, value] of toSearchParams(query).entries()) url.searchParams.set(key, value);
  url.searchParams.set('locale', locale);

  /*
   * ERR-05(1): `fetch` signals transport failure only by rejecting, so the
   * rejection is converted to a value here with the same `.then(onOk, onErr)`
   * idiom the API client uses. No `try/catch` is used for control flow (ERR-01).
   */
  const response = await fetch(url, {
    // `exactOptionalPropertyTypes`: RequestInit wants `AbortSignal | null`, so an
    // absent signal is spelled `null` rather than left `undefined`.
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

  const parsed = suggestionsSchema.safeParse(payload);
  if (!parsed.success) {
    return err({
      kind: 'CONTRACT_VIOLATION',
      issues: parsed.error.issues[0]?.message ?? 'unknown',
    });
  }

  return ok(parsed.data);
}
