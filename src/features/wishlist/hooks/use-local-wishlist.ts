'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'al-asad.wishlist';
/** Fired on this tab too, because `storage` only reaches OTHER tabs. */
const CHANGE_EVENT = 'al-asad:wishlist';

function read(): string[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return [];

  // ERR-05(2): a corrupt or hand-edited value is recoverable — treat it as empty
  // rather than letting a parse error take down every card on the page.
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
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
    const next = read().includes(productId)
      ? read().filter((id) => id !== productId)
      : [...read(), productId];

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    // Every mounted card listens, so all of them re-render in step.
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const clear = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { ids, isReady, toggle, clear };
}
