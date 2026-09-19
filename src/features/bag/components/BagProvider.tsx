'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/query-keys';

import { bagSummaryQuery } from '../api/bag-summary-query';
import { useBagPanel } from '../hooks/use-bag-panel';
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
  const { isOpen, open, close } = useBagPanel();
  const queryClient = useQueryClient();

  // DATA-09 — read again on focus, when the header's bag is opened, and on `/bag`
  // (`bagSummaryQuery` has why: this provider never remounts).
  const bag = useQuery(bagSummaryQuery());

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
