'use client';

import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { accountKeyOf, useSession } from '@/features/auth';
import type { Locale } from '@/i18n/locales';
import { queryKeys } from '@/lib/api/query-keys';
import type { SizeId } from '@/lib/domain/ids';
import { unwrap } from '@/lib/result';

import { readSavedSizes } from '../api/saved-sizes-browser';
import type { SavedSize, SavedSizes } from '../schemas/saved-size.schema';

export interface SavedSizesOptions {
  /** The language the sizes' names are read in — part of the cache key. */
  readonly locale: Locale;
  /** The list a Server Component has already read, so the browser does not ask again. */
  readonly initial?: SavedSizes;
}

export interface SavedSizesKeys {
  /** This account's list, in this language. */
  readonly current: readonly unknown[];
  /** Every language's copy of it — what a change marks out of date. */
  readonly all: readonly unknown[];
}

export interface SavedSizesState {
  readonly keys: SavedSizesKeys;
  readonly sizes: readonly SavedSize[];
  /** The saved sizes' ids — what a size selector matches its own sizes against. */
  readonly sizeIds: readonly SizeId[];
  readonly isSignedIn: boolean;
  /** False until the list has been read, so empty and unread are told apart. */
  readonly isReady: boolean;
  /**
   * The list is on file and has never been READ — not the same as having none.
   * A later read that fails keeps the list already shown: every refused change
   * asks again, and when that read failed too the offer and its refusal vanished.
   */
  readonly isUnreadable: boolean;
}

const NONE: readonly SavedSize[] = [];

/**
 * §28.3's saved sizes, for a signed-in customer — read once, wherever asked.
 *
 * The product page's buy box, a card's size tray and the account's list all ask
 * for the same list under the same key, so TanStack dedupes them into one request
 * (DATA-05). A guest has none and nothing is asked: §2.1 gives saved sizes to the
 * Customer.
 *
 * KEYED BY THE ACCOUNT, like the address book: signing out and in again as
 * somebody else is one soft navigation with the query cache still in memory, and
 * one customer's sizes must not be chosen for the next one out of a cache.
 */
export function useSavedSizes({ locale, initial }: SavedSizesOptions): SavedSizesState {
  const session = useSession();
  const { isSignedIn } = session;
  const accountKey = isSignedIn ? accountKeyOf(session) : '';
  const current = queryKeys.account.savedSizes(accountKey, locale);

  const query = useQuery({
    queryKey: current,
    queryFn: ({ signal }) => unwrap(readSavedSizes(signal)),
    enabled: isSignedIn,
    // DATA-09 — a customer's own choice, changed only by this customer's writes.
    staleTime: 30 * 1000,
    retry: false,
    /* A function rather than the value: under `exactOptionalPropertyTypes` an
       absent list must be "no initial data", which only the function form can
       say — and the cache takes it only when it holds nothing for this key. */
    initialData: () => initial,
  });

  const sizes = query.data?.sizes ?? NONE;
  // Memoised: the selection a product page pre-fills is derived from these ids.
  const sizeIds = useMemo(() => sizes.map((entry) => entry.size.id), [sizes]);

  return {
    keys: { current, all: queryKeys.account.savedSizesOf(accountKey) },
    sizes,
    sizeIds,
    isSignedIn,
    isReady: isSignedIn ? query.isSuccess || query.isError : true,
    isUnreadable: isSignedIn && query.isError && query.data === undefined,
  };
}
