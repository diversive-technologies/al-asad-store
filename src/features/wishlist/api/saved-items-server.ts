import 'server-only';

import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import { API_HEADERS } from '@/lib/api/headers';
import type { Result } from '@/lib/result';

import { savedItemsSchema, type SavedItems } from '../schemas/saved-items.schema';

/**
 * §28.3's saved items, for whoever is signed in.
 *
 * The account is read from the SESSION here and attached as a header, never
 * taken from the request the browser sent: a list that named its own owner would
 * let any browser read or write any customer's.
 *
 * DATA-09 — uncacheable, and not only because it is per-customer: the owner
 * travels in a header and Next's data cache is keyed on the request, so a cached
 * entry would be shared between customers.
 */
function withAccount<T>(
  accountKey: string,
  call: (headers: Record<string, string>) => Promise<Result<T, ApiError>>,
): Promise<Result<T, ApiError>> {
  return call({ [API_HEADERS.accountKey]: accountKey });
}

export function fetchSavedItems(accountKey: string): Promise<Result<SavedItems, ApiError>> {
  return withAccount(accountKey, (headers) =>
    apiRequest({
      path: ENDPOINTS.account.savedItems,
      headers,
      schema: savedItemsSchema,
      next: { revalidate: 0 },
    }),
  );
}

export function saveItems(
  accountKey: string,
  productIds: readonly string[],
): Promise<Result<SavedItems, ApiError>> {
  return withAccount(accountKey, (headers) =>
    apiRequest({
      path: ENDPOINTS.account.savedItems,
      method: 'POST',
      body: { productIds },
      headers,
      schema: savedItemsSchema,
      next: { revalidate: 0 },
    }),
  );
}

/** D6 — records that the items were removed; nothing is destroyed. */
export function removeItems(
  accountKey: string,
  productIds: readonly string[],
): Promise<Result<SavedItems, ApiError>> {
  return withAccount(accountKey, (headers) =>
    apiRequest({
      path: ENDPOINTS.account.savedItemRemoval,
      method: 'POST',
      body: { productIds },
      headers,
      schema: savedItemsSchema,
      next: { revalidate: 0 },
    }),
  );
}
