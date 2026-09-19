import { ROUTES } from '@/config/routes';
import { fetchWithContract } from '@/lib/api/browser-fetch';
import { err, ok, type Result } from '@/lib/result';

import type { BackInStockOutcome, BackInStockRequest } from '../schemas/back-in-stock.schema';
import type { BackInStockError } from '../types';

/*
 * Deliberate code split (IMP-01a, PERF-10): the offer sits under every size
 * selector, so a static import of its schema made Zod first-load JavaScript on
 * every product page, for a request made only when a sold-out size is pressed.
 * It arrives with the request instead (`fetchWithContract` has the
 * reasoning).
 */
const loadSchema = () => import('../schemas/back-in-stock.schema');

/**
 * The browser side of §28.2's Notify Me: our own BFF, never Java directly.
 *
 * DATA-02 — the BFF is a network boundary like any other, so its answer is
 * PARSED rather than cast. ERR-05(1) / ERR-01 — a rejected fetch becomes a
 * value; there is no try/catch for flow.
 */
export async function postBackInStock(
  request: BackInStockRequest,
): Promise<Result<BackInStockOutcome, BackInStockError>> {
  const [response, contract] = await fetchWithContract(
    ROUTES.api.backInStock,
    {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
    loadSchema,
  );

  if (response === null) return err({ kind: 'UNREACHABLE' });
  if (response.status === 400) return err({ kind: 'INVALID' });
  if (response.status === 404) return err({ kind: 'NOT_OFFERED' });
  if (!response.ok || contract === null) return err({ kind: 'UNREACHABLE' });

  const payload: unknown = await response.json().then<unknown, null>(
    (value: unknown) => value,
    () => null,
  );

  const parsed = contract.backInStockOutcomeSchema.safeParse(payload);
  return parsed.success ? ok(parsed.data) : err({ kind: 'UNREACHABLE' });
}
