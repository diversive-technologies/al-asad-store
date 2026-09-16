'use client';

import { useCallback, useMemo } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { unwrap } from '@/lib/result';

import { postSavedItemRemoval, postSavedItems } from '../api/saved-items-browser';
import { useLocalWishlist } from './use-local-wishlist';
import { useSavedItemsQuery } from './use-saved-items-query';

/** One shared empty list, so an unread account list is a STABLE reference. */
const EMPTY: readonly string[] = [];

export interface Wishlist {
  /**
   * Every saved id, in the order they were saved.
   *
   * The order is the customer's, not the catalogue's, and the page that renders
   * this list preserves it — re-sorting would quietly discard the one piece of
   * meaning the list carries beyond its membership.
   */
  readonly ids: readonly string[];
  /**
   * False until the list has been READ, so an empty list can be told apart from
   * an unread one. Without it the saved-items page would flash "nothing saved"
   * on every load before showing the items.
   */
  readonly isReady: boolean;
  /**
   * The account's list could not be READ — which is not the same as empty, and
   * must not be shown as it. An empty list says the customer saved nothing; this
   * says we could not find out, and their items are still on file.
   */
  readonly isUnreadable: boolean;
  readonly isSaved: (productId: string) => boolean;
  readonly toggle: (productId: string) => void;
  /**
   * The last change THIS heart asked for was refused, and has been put back.
   *
   * Per hook instance, which is per card, so a refusal belongs to the product it
   * happened on rather than lighting up every heart on the page.
   */
  readonly changeFailed: boolean;
}

/** One press: which product, which way, and the list it was pressed against. */
interface Change {
  readonly productId: string;
  readonly saving: boolean;
  readonly was: readonly string[];
}

/**
 * §28.3's saved items — the account's, for a signed-in customer.
 *
 * A saved item belongs to the CUSTOMER, so it is held by the account and follows
 * them between devices. A guest has no account for one to belong to, so the
 * browser's own list is what they would have; today the heart is offered only to
 * a signed-in customer, so in practice a guest's list is only ever the one they
 * built before signing in, which `SavedItemsProvider` hands over.
 *
 * The toggle is OPTIMISTIC. A heart that waited for a round trip would feel
 * broken on a slow connection, and the server's answer replaces the guess as
 * soon as it lands; a failure puts the question back to the server rather than
 * leaving a wrong answer on screen.
 */
export function useWishlist(): Wishlist {
  const { key, query, isSignedIn } = useSavedItemsQuery();
  const local = useLocalWishlist();
  const client = useQueryClient();

  const change = useMutation({
    /*
     * SCOPED, so two presses on one heart queue instead of racing. Saving and
     * removing are different routes on different connections: unscoped, a
     * double press could have the removal reach the store BEFORE the save it was
     * undoing, which is a no-op on a row that does not exist yet — leaving the
     * product saved after the customer's last action was to unsave it.
     */
    scope: { id: 'saved-items' },
    mutationFn: (next: Change) =>
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

  /*
   * Memoised because `?? EMPTY` is only stable while the account's list is
   * unread, and this value is a dependency of both callbacks below — without it
   * every card on the page re-renders on every render of this hook.
   */
  const ids = useMemo(
    () => (isSignedIn ? (query.data?.ids ?? EMPTY) : local.ids),
    [isSignedIn, query.data, local.ids],
  );

  const toggle = useCallback(
    (productId: string) => {
      if (!isSignedIn) return local.toggle(productId);

      const held = ids.includes(productId);
      const next = held ? ids.filter((id) => id !== productId) : [...ids, productId];
      client.setQueryData(key, { ids: next });
      change.mutate({ productId, saving: !held, was: ids });
    },
    [isSignedIn, local, ids, client, key, change],
  );

  return {
    ids,
    isReady: isSignedIn ? query.isSuccess || query.isError : local.isReady,
    isUnreadable: isSignedIn && query.isError,
    isSaved: useCallback((productId: string) => ids.includes(productId), [ids]),
    toggle,
    changeFailed: change.isError,
  };
}
