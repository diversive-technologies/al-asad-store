import { z } from 'zod';

import {
  productCardSchema,
  productAvailabilitySchema,
  type ProductCardWithAvailability,
} from '@/features/catalogue/contract';
import { ROUTES } from '@/config/routes';
import { err, ok, type Result } from '@/lib/result';

/**
 * DATA-02 — our own BFF is a network boundary like any other, so its response
 * is parsed rather than cast.
 *
 * The shape mirrors what `mergeAvailability` produces on the server: a card
 * beside the availability that decorates it, with `null` meaning "not known"
 * rather than "sold out" (§30.2).
 */
const savedEntriesSchema = z.object({
  entries: z.array(
    z.object({
      product: productCardSchema,
      availability: productAvailabilitySchema.nullable(),
    }),
  ),
});

export interface SavedProductsError {
  kind: 'UNREACHABLE';
}

/**
 * The browser side of the saved-items list: our own BFF, never Java directly.
 *
 * The ids travel in the query string because they come from `localStorage` and
 * the server has no other way to learn them. They are product ids, which are
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

  // ERR-05(1) / ERR-01: the rejection becomes a value; no try/catch for flow.
  const response = await fetch(url, {
    signal: signal ?? null,
    headers: { Accept: 'application/json' },
  }).then<Response | null, null>(
    (result) => result,
    () => null,
  );

  if (response === null || !response.ok) return err({ kind: 'UNREACHABLE' });

  const payload: unknown = await response.json().then<unknown, null>(
    (value: unknown) => value,
    () => null,
  );

  const parsed = savedEntriesSchema.safeParse(payload);
  return parsed.success ? ok(parsed.data.entries) : err({ kind: 'UNREACHABLE' });
}
