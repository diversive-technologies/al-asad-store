'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { unwrap } from '@/lib/result';

import {
  postSavedItemRemoval,
  postSavedItems,
  type SavedItemsError,
} from '../api/saved-items-browser';
import type { SavedItems } from '../schemas/saved-items.schema';

/** One press: which product, which way, and the list it was pressed against. */
export interface SavedItemChange {
  readonly productId: string;
  readonly saving: boolean;
  readonly was: readonly string[];
}

/**
 * One heart's press, sent to the account — the write half of `useWishlist`.
 *
 * `key` is the account's own cache entry (`useSavedItemsQuery`), so the answer
 * lands where every card reads the list.
 */
export function useSavedItemChange(
  key: readonly unknown[],
): UseMutationResult<SavedItems, SavedItemsError, SavedItemChange> {
  const client = useQueryClient();

  // `unwrap` rejects with the Result's error value (DATA-03a), so that is the error type.
  return useMutation<SavedItems, SavedItemsError, SavedItemChange>({
    /*
     * SCOPED, so two presses on one heart queue instead of racing. Saving and
     * removing are different routes on different connections: unscoped, a
     * double press could have the removal reach the store BEFORE the save it was
     * undoing, which is a no-op on a row that does not exist yet — leaving the
     * product saved after the customer's last action was to unsave it.
     */
    scope: { id: 'saved-items' },
    mutationFn: (next: SavedItemChange) =>
      unwrap(
        next.saving ? postSavedItems([next.productId]) : postSavedItemRemoval([next.productId]),
      ),
    onSuccess: (items) => {
      client.setQueryData(key, items);
    },
    /*
     * PUT BACK what was on screen before the press, rather than only asking the
     * server again: the refetch can fail too (it does not retry), and TanStack
     * keeps the last data it had — which is the guess — so an unanswered failure
     * would leave the heart filled for the life of the page on a product that
     * was never saved. The invalidate still runs, so the server has the last
     * word when it can be reached; `changeFailed` is what SAYS so.
     */
    onError: (_error, next) => {
      client.setQueryData(key, { ids: next.was });
      void client.invalidateQueries({ queryKey: key });
    },
  });
}
