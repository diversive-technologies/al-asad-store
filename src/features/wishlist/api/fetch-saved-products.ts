import type { ProductCardWithAvailability } from '@/features/catalogue/contract';
import { ROUTES } from '@/config/routes';
import { fetchWithContract } from '@/lib/api/browser-fetch';
import { err, ok, type Result } from '@/lib/result';

/*
 * Deliberate code split (IMP-01a, PERF-10): the response's schema — and with it
 * Zod — was first-load JavaScript on the saved-items page. It lives in its own
 * schema module (SSOT-09) and arrives beside the response instead
 * (`fetchWithContract` has the reasoning).
 */
const loadSchema = () => import('../schemas/saved-products.schema');

export interface SavedProductsError {
  kind: 'UNREACHABLE';
}

/**
 * The browser side of the saved-items list: our own BFF, never Java directly.
 *
 * The ids travel in the query string because the screen that holds them is a
 * CLIENT one, so the browser is what has them. They are product ids, which are
 * public and appear in every listing response — SEC-01's rule about keeping
 * data out of URLs is about credentials and personal data, and a list of
 * catalogue ids is neither.
 */
export async function fetchSavedProducts(
  ids: readonly string[],
  locale: string,
  signal?: AbortSignal,
): Promise<Result<ProductCardWithAvailability[], SavedProductsError>> {
  if (ids.length === 0) return ok([]);

  const url = new URL(ROUTES.api.products, window.location.origin);
  url.searchParams.set('ids', ids.join(','));
  url.searchParams.set('locale', locale);

  // ERR-05(1) / ERR-01: a rejection becomes a value; no try/catch for flow.
  const [response, contract] = await fetchWithContract(
    url,
    { signal: signal ?? null, headers: { Accept: 'application/json' } },
    loadSchema,
  );

  if (response === null || !response.ok || contract === null) return err({ kind: 'UNREACHABLE' });

  const payload: unknown = await response.json().then<unknown, null>(
    (value: unknown) => value,
    () => null,
  );

  const parsed = contract.savedEntriesSchema.safeParse(payload);
  return parsed.success ? ok(parsed.data.entries) : err({ kind: 'UNREACHABLE' });
}
