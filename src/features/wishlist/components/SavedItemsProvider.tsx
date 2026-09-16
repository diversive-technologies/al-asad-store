'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { useCarryLocalList } from '../hooks/use-carry-local-list';

/** How many items this browser has just handed to the account. Zero, usually. */
const CarriedContext = createContext(0);

/**
 * Mounted once, above the routes: the browser's own saved list, handed over.
 *
 * It renders nothing. It exists so the hand-over happens exactly ONCE per visit
 * however many hearts are on screen — the carry has to run wherever a customer
 * lands after signing in, and that is any page, so it belongs beside the session
 * rather than inside a card.
 *
 * What it provides is one number, which is why this is Context and not TanStack
 * Query: it is client state, it changes at most once, and the list it moved is
 * server state that stays in the query cache where the cards read it (STATE-02).
 */
export function SavedItemsProvider({ children }: { children: ReactNode }) {
  const carried = useCarryLocalList();

  return <CarriedContext.Provider value={carried}>{children}</CarriedContext.Provider>;
}

/**
 * How many saved items were carried out of this browser into the account, on
 * this visit. The saved-items page says so; nothing else needs to know.
 */
export function useCarriedFromThisBrowser(): number {
  return useContext(CarriedContext);
}
