'use client';

import { useCallback, useRef } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { accountKeyOf, useSession } from '@/features/auth';
import { queryKeys } from '@/lib/api/query-keys';
import type { AddressDetail } from '@/lib/domain/address';
import { unwrap } from '@/lib/result';

import {
  postAddress,
  postAddressRemoval,
  postDefaultAddress,
  readAddresses,
  type AddressBookError,
} from '../api/addresses-browser';
import type { SavedAddress } from '../schemas/address.schema';

/** One change to the book. Which one is decided by what the caller names. */
type Change =
  | { readonly kind: 'WRITE'; readonly address: AddressDetail; readonly addressId?: string }
  | { readonly kind: 'REMOVE'; readonly addressId: string }
  | { readonly kind: 'DEFAULT'; readonly addressId: string };

export interface AddressBookState {
  readonly addresses: readonly SavedAddress[];
  /** False until the book has been read, so empty and unread are distinct. */
  readonly isReady: boolean;
  /** The book is on file and could not be READ — not the same as having none. */
  readonly isUnreadable: boolean;
  readonly isChanging: boolean;
  /** Why the last change was refused, in a form the page can put into words. */
  readonly failure: AddressBookError['kind'] | null;
  /** Each answers true once the book has taken it, so a caller can move focus. */
  readonly save: (address: AddressDetail, addressId?: string) => Promise<boolean>;
  readonly remove: (addressId: string) => Promise<boolean>;
  readonly makeDefault: (addressId: string) => Promise<boolean>;
}

/**
 * §28.3's address book, for a signed-in customer.
 *
 * Every change RETURNS the whole book, so there is no optimistic guess to
 * reconcile and no second copy of the default rule in the browser: the server
 * decides which address is default and the answer replaces what was on screen.
 * That is the right trade here and not on the heart — a heart is pressed in
 * passing and must feel instant, while saving an address is a form somebody
 * filled in and already expects to take a moment.
 *
 * KEYED BY THE ACCOUNT, like the saved items: signing out and in again as
 * somebody else is one soft navigation with the query cache still in memory,
 * and an address book is exactly the thing that must not come out of a cache
 * belonging to the person before.
 */
export function useAddresses(): AddressBookState {
  const session = useSession();
  const { isSignedIn } = session;
  const client = useQueryClient();
  const key = queryKeys.account.addresses(isSignedIn ? accountKeyOf(session) : '');

  const book = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => unwrap(readAddresses(signal)),
    enabled: isSignedIn,
    staleTime: 30 * 1000,
    retry: false,
  });

  const change = useMutation({
    /* Scoped, so two changes queue rather than race: the book each one returns
       is the whole book, and the later answer must be the later change. */
    scope: { id: 'addresses' },
    mutationFn: (next: Change) => {
      if (next.kind === 'REMOVE') return unwrap(postAddressRemoval(next.addressId));
      if (next.kind === 'DEFAULT') return unwrap(postDefaultAddress(next.addressId));
      return unwrap(postAddress(next.address, next.addressId));
    },
    onSuccess: (updated) => {
      client.setQueryData(key, updated);
    },
    /*
     * ASK THE SERVER AGAIN on any refusal. `GONE` in particular means the book
     * on screen is out of date — an address removed in another tab — and
     * without this the page printed "that address is no longer in your book"
     * directly above the card it was talking about, with Edit, Make default and
     * Remove all still offered and all still failing. `refetchOnWindowFocus` is
     * off globally, so nothing else would ever catch it up.
     */
    onError: () => {
      void client.invalidateQueries({ queryKey: key });
    },
  });

  /*
   * FORM-06, synchronously. `isChanging` only becomes true after a re-render,
   * so two taps on "Remove" in one tick both pass — and because the mock mints
   * a fresh id per save, a double-tapped save writes the SAME address twice.
   * Latching here rather than in each caller is what makes every one of them
   * safe, including the one-button offer on the confirmation page.
   */
  const inFlight = useRef(false);

  const run = useCallback(
    (next: Change): Promise<boolean> => {
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

  return {
    addresses: book.data?.addresses ?? [],
    isReady: isSignedIn ? book.isSuccess || book.isError : true,
    isUnreadable: isSignedIn && book.isError,
    isChanging: change.isPending,
    failure: failureOf(change.error),
    save: (address, addressId) =>
      /* Built in two branches rather than with `addressId: undefined`, because
         `exactOptionalPropertyTypes` makes "absent" and "present and undefined"
         different things — and here they mean a save and a revision. */
      run(
        addressId === undefined
          ? { kind: 'WRITE', address }
          : { kind: 'WRITE', address, addressId },
      ),
    remove: (addressId) => run({ kind: 'REMOVE', addressId }),
    makeDefault: (addressId) => run({ kind: 'DEFAULT', addressId }),
  };
}

/* `unwrap` rejects with the error VALUE, so the union is recoverable from the
   mutation's own error without a cast (DATA-03a). Anything else that could be
   thrown is reported as unreachable rather than guessed at. */
function failureOf(error: unknown): AddressBookError['kind'] | null {
  if (error === null || typeof error !== 'object') return null;
  const kind = (error as { kind?: unknown }).kind;
  return kind === 'SIGNED_OUT' || kind === 'FULL' || kind === 'GONE' || kind === 'UNREACHABLE'
    ? kind
    : null;
}
