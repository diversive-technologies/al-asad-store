'use client';

import { useQuery } from '@tanstack/react-query';

import { accountKeyOf, useSession } from '@/features/auth';
import { queryKeys } from '@/lib/api/query-keys';
import type { AddressDetail } from '@/lib/domain/address';
import { unwrap } from '@/lib/result';

import { readAddresses, type AddressBookError } from '../api/addresses-browser';
import { addressFailureOf } from '../lib/address-refusal';
import type { SavedAddress } from '../schemas/address.schema';
import { useAddressChanges } from './use-address-changes';

export interface AddressBookState {
  readonly addresses: readonly SavedAddress[];
  /** False until the book has been read, so empty and unread are distinct. */
  readonly isReady: boolean;
  /**
   * The book is on file and has NEVER been read — not the same as having none.
   * A later read that fails keeps the book already on screen instead.
   */
  readonly isUnreadable: boolean;
  /**
   * The backend says the session has ended, whatever this page was told at load —
   * found out by a read or by a change, and then the reason for either refusal.
   */
  readonly hasSessionEnded: boolean;
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
 * filled in and already expects to take a moment. The writes are
 * `useAddressChanges`.
 *
 * KEYED BY THE ACCOUNT, like the saved items: signing out and in again as
 * somebody else is one soft navigation with the query cache still in memory,
 * and an address book is exactly the thing that must not come out of a cache
 * belonging to the person before.
 */
export function useAddresses(): AddressBookState {
  const session = useSession();
  const { isSignedIn } = session;
  const key = queryKeys.account.addresses(isSignedIn ? accountKeyOf(session) : '');

  const book = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => unwrap(readAddresses(signal)),
    enabled: isSignedIn,
    staleTime: 30 * 1000,
    retry: false,
  });

  const changes = useAddressChanges(key);
  const readFailure = addressFailureOf(book.error);

  return {
    addresses: book.data?.addresses ?? [],
    isReady: isSignedIn ? book.isSuccess || book.isError : true,
    /*
     * ERR-04 — only a book that was never read is unreadable. Every refused change
     * asks the server again, and when THAT read failed too, TanStack keeps the book
     * it had and marks the query errored: the whole page used to give way to "try
     * again in a moment", taking the refusal and the customer's book with it.
     */
    isUnreadable: isSignedIn && book.isError && book.data === undefined,
    hasSessionEnded:
      isSignedIn && (readFailure === 'SIGNED_OUT' || changes.failure === 'SIGNED_OUT'),
    isChanging: changes.isChanging,
    failure: changes.failure,
    save: (address, addressId) =>
      /* Built in two branches rather than with `addressId: undefined`, because
         `exactOptionalPropertyTypes` makes "absent" and "present and undefined"
         different things — and here they mean a save and a revision. */
      changes.run(
        addressId === undefined
          ? { kind: 'WRITE', address }
          : { kind: 'WRITE', address, addressId },
      ),
    remove: (addressId) => changes.run({ kind: 'REMOVE', addressId }),
    makeDefault: (addressId) => changes.run({ kind: 'DEFAULT', addressId }),
  };
}
