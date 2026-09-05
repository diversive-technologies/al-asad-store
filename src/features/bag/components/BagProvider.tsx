'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { usePathname } from 'next/navigation';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/query-keys';
import { unwrap } from '@/lib/result';

import { fetchBag } from '../api/bag-browser';
import type { BagSummary } from '../schemas/bag.schema';

interface BagContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  bag: UseQueryResult<BagSummary>;
  /** Called by every mutation with the summary the backend just returned. */
  onSummary: (summary: BagSummary) => void;
}

const BagContext = createContext<BagContextValue | null>(null);

/**
 * STATE-01 — the escalation ladder, and why this lands on rung 5 (Context).
 *
 * The panel is opened from two places in different subtrees: the header's bag
 * button, and Add to bag on a product page. Lifting to a common ancestor means
 * lifting to the root layout, and threading `isOpen` from there through every
 * page would be prop-drilling across the whole app. Context is the rung above,
 * and it is the right one — this is exactly the "low-frequency, app-wide
 * concern" the rule names. A Zustand store would be rung 6 for one boolean.
 *
 * STATE-02 — the bag CONTENTS are not in here. They are server state: rows in
 * Java with live reservations against them, which the frontend does not own and
 * must not mirror. TanStack Query holds them; this context holds one boolean
 * and hands the query down.
 */
export function BagProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const bag = useQuery({
    queryKey: queryKeys.bag.summary(),
    // DATA-03a: `unwrap` is the only sanctioned Result→throw adapter.
    queryFn: ({ signal }) => unwrap(fetchBag(signal)),
    /*
     * DATA-09 — `staleTime: 0`. A bag holds reservations that expire, and its
     * prices can change under a promotion; there is no interval over which a
     * cached copy is safe to show. Refetching on focus matters more here than
     * anywhere else in the store: a customer who left the tab open for an hour
     * has a bag whose holds have lapsed.
     */
    staleTime: 0,
    retry: false,
  });

  /*
   * DATA-06 — every mutation returns the whole refreshed summary, so the cache
   * is SET rather than invalidated. Invalidating would cost a second round trip
   * to learn what the first one already told us, and would leave a window where
   * the panel shows the pre-mutation bag.
   */
  const onSummary = useCallback(
    (summary: BagSummary) => {
      queryClient.setQueryData(queryKeys.bag.summary(), summary);
    },
    [queryClient],
  );

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  /*
   * Close on navigation.
   *
   * The panel lives in the root layout, so it survives a route change: a
   * customer following a product link out of their bag would otherwise land on
   * the product page with a modal still over it and the page behind it inert.
   * Doing it here covers every link inside the panel at once, including the
   * ones inside each bag line.
   *
   * Adjusted DURING RENDER rather than in an effect. This is React's own
   * "you might not need an effect" case — state derived from a prop-like value
   * changing — and an effect would render the stale open panel once before
   * closing it, as well as tripping `react-hooks/set-state-in-effect`.
   */
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsOpen(false);
  }

  const value = useMemo(
    () => ({ isOpen, open, close, bag, onSummary }),
    [isOpen, open, close, bag, onSummary],
  );

  return <BagContext.Provider value={value}>{children}</BagContext.Provider>;
}

/** Throws when used outside the provider — a wiring mistake, not a runtime state (ERR-06). */
export function useBag(): BagContextValue {
  const value = useContext(BagContext);
  if (value === null) throw new Error('useBag must be used inside <BagProvider>.');
  return value;
}
