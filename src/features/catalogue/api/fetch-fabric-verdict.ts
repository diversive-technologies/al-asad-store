import { ROUTES } from '@/config/routes';
import { err, ok, type Result } from '@/lib/result';

import {
  fabricVerdictSchema,
  type FabricQuery,
  type FabricVerdict,
} from '../schemas/fabric-calculator.schema';

/** The browser side of §25: reads our own BFF, never the Java service directly. */
export async function fetchFabricVerdict(
  query: FabricQuery,
  signal?: AbortSignal,
): Promise<Result<FabricVerdict, { kind: 'UNAVAILABLE' }>> {
  const url = new URL(ROUTES.api.fabricCalculator, window.location.origin);
  url.searchParams.set('productId', query.productId);
  url.searchParams.set('heightCm', String(query.heightCm));
  url.searchParams.set('styleId', query.styleId);

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
  const parsed = fabricVerdictSchema.safeParse(payload);
  return parsed.success ? ok(parsed.data) : err({ kind: 'UNAVAILABLE' });
}
