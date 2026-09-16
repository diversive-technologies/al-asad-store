'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { accountKeyOf, useSession } from '@/features/auth';
import { queryKeys } from '@/lib/api/query-keys';
import { unwrap } from '@/lib/result';

import { readSavedItems } from '../api/saved-items-browser';
import type { SavedItems } from '../schemas/saved-items.schema';

export interface SavedItemsQuery {
  /** The cache entry this list lives in, keyed by the account it belongs to. */
  readonly key: readonly unknown[];
  readonly query: UseQueryResult<SavedItems>;
  readonly isSignedIn: boolean;
}

/**
 * §28.3's list as the account holds it — read once, wherever it is asked for.
 *
 * Both the heart and the carry need the same list and the same key, and two
 * copies of the query's own options would be two places for its cache lifetime
 * to drift (PD-01). TanStack dedupes on the key, so the twenty-four cards on a
 * listing and the provider above them share one request.
 *
 * KEYED BY THE ACCOUNT, unlike the bag's summary — and the difference is what
 * the key has to survive. A cart id belongs to the browser, so signing out does
 * not change whose bag it is; a saved list belongs to the CUSTOMER, and signing
 * out and in again as somebody else is one soft navigation with the query cache
 * still in memory. One key for both would show the previous customer's saved
 * items to the next one, out of the cache, before any refetch landed.
 */
export function useSavedItemsQuery(): SavedItemsQuery {
  const session = useSession();
  const { isSignedIn } = session;
  const key = queryKeys.wishlist.savedItems(isSignedIn ? accountKeyOf(session) : '');

  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => unwrap(readSavedItems(signal)),
    enabled: isSignedIn,
    staleTime: 30 * 1000,
    retry: false,
  });

  return { key, query, isSignedIn };
}
