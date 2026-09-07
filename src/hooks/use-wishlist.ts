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

export interface Wishlist {
  /**
   * Every saved id, in the order they were saved.
   *
   * The order is the customer's, not the catalogue's, and the page that renders
   * this list preserves it — re-sorting would quietly discard the one piece of
   * meaning the list carries beyond its membership.
   *
   * Empty on the first render, always: the ids are read in an effect so that
   * the server render and the first client render agree, which is what
   * hydration requires. A consumer must therefore treat "empty" as "not known
   * yet" until `isReady`.
   */
  ids: readonly string[];
  /**
   * False until `localStorage` has been read, so an empty list can be told
   * apart from an unread one. Without it the saved-items page would flash
   * "nothing saved" on every load before showing the items.
   */
  isReady: boolean;
  isSaved: (productId: string) => boolean;
  toggle: (productId: string) => void;
}

/**
 * The saved-items list, held in this browser.
 *
 * **This is an interim, and it is worth being precise about why.** A real
 * wishlist belongs to a CUSTOMER (§28.3) and therefore needs the account system
 * that D3 defers to M6 — so today there is nobody to attach it to. Rather than
 * leave the heart inert, it persists locally: the customer gets the affordance
 * and their choices survive a reload, on one device.
 *
 * What that means, stated rather than discovered later: it does not follow them
 * to a phone, and it is not visible to the operator. When M6 lands, this hook
 * is replaced by a server-backed list and the components above it do not
 * change — which is the point of the shape it already has.
 */
export function useWishlist(): Wishlist {
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

  const isSaved = useCallback((productId: string) => ids.includes(productId), [ids]);

  const toggle = useCallback((productId: string) => {
    const next = read().includes(productId)
      ? read().filter((id) => id !== productId)
      : [...read(), productId];

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    // Every mounted card listens, so all of them re-render in step.
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { ids, isReady, isSaved, toggle };
}
