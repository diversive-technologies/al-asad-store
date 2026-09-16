'use client';

import { useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { unwrap } from '@/lib/result';

import { postSavedItems } from '../api/saved-items-browser';
import { useLocalWishlist } from './use-local-wishlist';
import { useSavedItemsQuery } from './use-saved-items-query';

/**
 * Carries a list built in this browser into the account, once.
 *
 * The saved list used to live in `localStorage`, so every customer who saved
 * something before it moved to the account still has one there. On their next
 * signed-in visit it is offered to the account and the browser's copy is emptied
 * — after which the list follows them to a phone, which is the whole point.
 *
 * It is mounted ONCE, by `SavedItemsProvider`, and not by the hook every card
 * calls: a listing holds twenty-four hearts, each would hold its own "already
 * carrying" latch, and all twenty-four would pass it on the same render and post
 * the same list. The store would dedupe them and the result would be right, but
 * twenty-four requests to move one list is not a thing to do once a customer is
 * on a real connection.
 *
 * Three things make it safe to run on every render:
 *
 * - it waits for the account's OWN list, so a carried id can be added to what is
 *   already there rather than racing it;
 * - it attempts ONCE per visit and never un-latches. The effect's dependencies
 *   include the local list, which is a new object on every render, so releasing
 *   the latch on failure would retry on the next render — a page that keeps
 *   rendering against an endpoint that keeps failing is a request storm. A
 *   failed carry waits for the next visit, which is what the browser's copy
 *   surviving is for;
 * - the browser's copy is cleared only after the account has confirmed the save,
 *   so a failure leaves the list exactly where it was.
 *
 * Saving something already saved changes nothing (the store leaves it alone and
 * keeps its place), so a carry that runs twice cannot reorder or duplicate.
 */
export function useCarryLocalList(): number {
  const { key, query, isSignedIn } = useSavedItemsQuery();
  const local = useLocalWishlist();
  const client = useQueryClient();
  const carrying = useRef(false);
  const [carried, setCarried] = useState(0);
  const accountListIsKnown = query.data !== undefined;

  useEffect(() => {
    if (!isSignedIn || !local.isReady || !accountListIsKnown) return;
    if (local.ids.length === 0 || carrying.current) return;

    carrying.current = true;
    const moving = local.ids;
    void unwrap(postSavedItems(moving)).then(
      (items) => {
        client.setQueryData(key, items);
        local.clear();
        setCarried(moving.length);
      },
      () => {
        /* Nothing was cleared and nothing is retried here: the browser still
           holds the list, and the next visit offers it again. */
      },
    );
  }, [isSignedIn, accountListIsKnown, local, key, client]);

  return carried;
}
