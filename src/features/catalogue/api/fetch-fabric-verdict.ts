import { ROUTES } from '@/config/routes';
import { fetchWithContract } from '@/lib/api/browser-fetch';
import { err, ok, type Result } from '@/lib/result';

import type { FabricQuery, FabricVerdict } from '../schemas/fabric-calculator.schema';

/*
 * Deliberate code split (IMP-01a, PERF-10): a static import of the verdict's
 * schema made Zod first-load JavaScript on every product page, for a read made
 * only once a height is entered. It arrives beside the response instead
 * (`fetchWithContract` has the reasoning).
 */
const loadSchema = () => import('../schemas/fabric-calculator.schema');

/** The browser side of §25: reads our own BFF, never the Java service directly. */
export async function fetchFabricVerdict(
  query: FabricQuery,
  signal?: AbortSignal,
): Promise<Result<FabricVerdict, { kind: 'UNAVAILABLE' }>> {
  const url = new URL(ROUTES.api.fabricCalculator, window.location.origin);
  url.searchParams.set('productId', query.productId);
  url.searchParams.set('heightCm', String(query.heightCm));
  url.searchParams.set('styleId', query.styleId);

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
  const parsed = contract.fabricVerdictSchema.safeParse(payload);
  return parsed.success ? ok(parsed.data) : err({ kind: 'UNAVAILABLE' });
}
