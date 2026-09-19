'use client';

import { useCallback, useRef } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { SizeId } from '@/lib/domain/ids';
import { unwrap } from '@/lib/result';

import {
  postSavedSize,
  postSavedSizeRemoval,
  type SavedSizesError,
} from '../api/saved-sizes-browser';
import { savedSizeFailureOf, type SavedSizeAction } from '../lib/saved-size-refusal';
import type { SavedSizes } from '../schemas/saved-size.schema';
import type { SavedSizesKeys } from './use-saved-sizes';

/** One change: remember a size, or forget one. */
export interface SavedSizeChange {
  readonly action: SavedSizeAction;
  readonly sizeId: SizeId;
}

export interface SavedSizeChanges {
  readonly isChanging: boolean;
  /** Why the last change was refused, in a form a surface can put into words. */
  readonly failure: SavedSizesError['kind'] | null;
  /** The account's list once the change is taken; `null` when it was refused or refused to start. */
  readonly run: (change: SavedSizeChange) => Promise<SavedSizes | null>;
}

/**
 * The write half of `useSavedSizes`: every change, one at a time.
 *
 * Every change RETURNS the account's whole list, which replaces the cache entry —
 * so there is no optimistic guess to reconcile, and no copy in the browser of the
 * rule that a size set holds one size (DATA-13). Remembering a size is a press
 * somebody chose to make, and a moment's wait for the real answer is the honest
 * trade; the heart's instant toggle is not.
 */
export function useSavedSizeChanges(keys: SavedSizesKeys): SavedSizeChanges {
  const client = useQueryClient();

  const change = useMutation({
    /* Scoped, so two changes queue rather than race: each answer is the whole
       list, and the later answer must be the later change. */
    scope: { id: 'saved-sizes' },
    mutationFn: (next: SavedSizeChange) =>
      unwrap(
        next.action === 'REMEMBER' ? postSavedSize(next.sizeId) : postSavedSizeRemoval(next.sizeId),
      ),
    onSuccess: (updated) => {
      // DATA-06 — any other language's copy is now out of date; this one is the answer.
      void client.invalidateQueries({ queryKey: keys.all, refetchType: 'none' });
      client.setQueryData(keys.current, updated);
    },
    /* ASK THE SERVER AGAIN on any refusal: `GONE` on a forget means the list on
       screen is older than the account's, and `refetchOnWindowFocus` is off
       globally, so nothing else would catch it up. */
    onError: () => {
      void client.invalidateQueries({ queryKey: keys.current });
    },
  });

  /*
   * FORM-06, synchronously. `isPending` only becomes true after a re-render, so
   * two taps in one tick would both pass; the latch is here rather than in each
   * surface so every one of them is safe.
   */
  const inFlight = useRef(false);
  const { mutateAsync } = change;

  const run = useCallback(
    (next: SavedSizeChange): Promise<SavedSizes | null> => {
      if (inFlight.current) return Promise.resolve(null);
      inFlight.current = true;
      return mutateAsync(next)
        .then(
          (updated) => updated,
          () => null,
        )
        .finally(() => {
          inFlight.current = false;
        });
    },
    [mutateAsync],
  );

  return { isChanging: change.isPending, failure: savedSizeFailureOf(change.error), run };
}
