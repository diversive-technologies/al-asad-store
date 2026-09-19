'use client';

import { useCallback, useEffect, useState } from 'react';

import { clientKey } from '@/config/client';
import { readStorage, removeStorage, writeStorage } from '@/lib/utils/browser-storage';

import { parseLocalList, toggledLocalList } from '../lib/local-list';

/** D5 — named through the client's key prefix, never with a brand written here. */
const STORAGE_KEY = clientKey('wishlist');
/** Fired on this tab too, because `storage` only reaches OTHER tabs. */
const CHANGE_EVENT = `${STORAGE_KEY}:change`;

/*
 * Every access goes through `browser-storage`, because a browser that blocks site
 * data throws on the mere READ of `localStorage` — and this runs on every page,
 * for every visitor, from `SavedItemsProvider` in the root layout. Unguarded, that
 * took the page to its error boundary; guarded, such a browser keeps no list.
 */
function read(): string[] {
  return parseLocalList(readStorage(STORAGE_KEY));
}

export interface LocalWishlist {
  /** In the order they were saved — the customer's order, not the catalogue's. */
  readonly ids: readonly string[];
  /** False until `localStorage` has been read, so empty and unread are distinct. */
  readonly isReady: boolean;
  readonly toggle: (productId: string) => void;
  /** Emptied once the list has been carried into an account (D6 lives there). */
  readonly clear: () => void;
}

/**
 * The saved list held in THIS browser.
 *
 * It is no longer where a signed-in customer's list lives — that is the account
 * now — but it keeps two jobs. It is what a browser hands over when its customer
 * signs in, so a list built before the account existed is not lost. And it is
 * what would hold a guest's list, if a guest were offered the heart.
 *
 * Nothing is deleted from the account by `clear`: it empties this BROWSER once
 * its contents have been saved somewhere that outlives it.
 */
export function useLocalWishlist(): LocalWishlist {
  const [ids, setIds] = useState<readonly string[]>([]);
  const [isReady, setIsReady] = useState(false);

  /*
   * STATE-04 — the external system is `localStorage`, plus the two events that
   * tell us it moved: `storage` for other tabs, and our own for this one.
   * Reading in an effect rather than in `useState` keeps the server render and
   * the first client render identical, which is what hydration requires.
   */
  useEffect(() => {
    const sync = (): void => {
      setIds(read());
      setIsReady(true);
    };

    sync();
    window.addEventListener('storage', sync);
    window.addEventListener(CHANGE_EVENT, sync);

    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const toggle = useCallback((productId: string) => {
    writeStorage(STORAGE_KEY, JSON.stringify(toggledLocalList(read(), productId)));
    // Every mounted card listens, so all of them re-render in step.
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const clear = useCallback(() => {
    removeStorage(STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { ids, isReady, toggle, clear };
}
