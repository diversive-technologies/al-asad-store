'use client';

import { useCallback, useRef } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { AddressDetail } from '@/lib/domain/address';
import { unwrap } from '@/lib/result';

import {
  postAddress,
  postAddressRemoval,
  postDefaultAddress,
  type AddressBookError,
} from '../api/addresses-browser';
import { addressFailureOf } from '../lib/address-refusal';

/** One change to the book. Which one is decided by what the caller names. */
export type AddressChange =
  | { readonly kind: 'WRITE'; readonly address: AddressDetail; readonly addressId?: string }
  | { readonly kind: 'REMOVE'; readonly addressId: string }
  | { readonly kind: 'DEFAULT'; readonly addressId: string };

export interface AddressChanges {
  readonly isChanging: boolean;
  /** Why the last change was refused, in a form the page can put into words. */
  readonly failure: AddressBookError['kind'] | null;
  /** Answers true once the book has taken the change, so a caller can move focus. */
  readonly run: (change: AddressChange) => Promise<boolean>;
}

/**
 * The write half of `useAddresses`: every change to the book, one at a time.
 *
 * Every change RETURNS the whole book, which replaces the cache entry at `key` —
 * so there is no optimistic guess to reconcile and no second copy of the default
 * rule in the browser.
 */
export function useAddressChanges(key: readonly unknown[]): AddressChanges {
  const client = useQueryClient();

  const change = useMutation({
    /* Scoped, so two changes queue rather than race: the book each one returns
       is the whole book, and the later answer must be the later change. */
    scope: { id: 'addresses' },
    mutationFn: (next: AddressChange) => {
      if (next.kind === 'REMOVE') return unwrap(postAddressRemoval(next.addressId));
      if (next.kind === 'DEFAULT') return unwrap(postDefaultAddress(next.addressId));
      return unwrap(postAddress(next.address, next.addressId));
    },
    onSuccess: (updated) => {
      client.setQueryData(key, updated);
    },
    /*
     * ASK THE SERVER AGAIN on any refusal. `GONE` in particular means the book on
     * screen is out of date — an address removed in another tab — and without
     * this the page printed "that address is no longer in your book" directly
     * above the card it was talking about, with every action still offered and
     * still failing. `refetchOnWindowFocus` is off globally, so nothing else
     * would ever catch it up.
     */
    onError: () => {
      void client.invalidateQueries({ queryKey: key });
    },
  });

  /*
   * FORM-06, synchronously. `isPending` only becomes true after a re-render, so
   * two taps on "Remove" in one tick both pass — and because the mock mints a
   * fresh id per save, a double-tapped save writes the SAME address twice.
   * Latching here rather than in each caller is what makes every one of them
   * safe, including the one-button offer on the confirmation page.
   */
  const inFlight = useRef(false);

  const run = useCallback(
    (next: AddressChange): Promise<boolean> => {
      if (inFlight.current) return Promise.resolve(false);
      inFlight.current = true;
      return change
        .mutateAsync(next)
        .then(
          () => true,
          () => false,
        )
        .finally(() => {
          inFlight.current = false;
        });
    },
    [change],
  );

  return { isChanging: change.isPending, failure: addressFailureOf(change.error), run };
}
