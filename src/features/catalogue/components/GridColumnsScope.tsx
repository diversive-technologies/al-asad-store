'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  GRID_COLUMNS_ATTRIBUTE,
  GRID_COLUMNS_COOKIE,
  type MobileColumns,
} from '../lib/grid-columns';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

interface GridColumnsValue {
  columns: MobileColumns;
  setColumns: (columns: MobileColumns) => void;
}

const GridColumnsContext = createContext<GridColumnsValue>({
  columns: 2,
  setColumns: () => undefined,
});

export interface GridColumnsScopeProps {
  /** Read from the cookie on the server, so the first paint is already right. */
  initialColumns: MobileColumns;
  children: ReactNode;
}

/**
 * The listing layout, carrying the reader's small-screen column choice as an
 * attribute the CSS keys off.
 *
 * STATE-01 — the choice is read by the control and applied by an ancestor of
 * the grid, which are cousins rather than parent and child, so it is context.
 * It is deliberately NOT URL state: how many columns someone likes on their
 * phone should not travel inside a shared link, where it would arrive as a
 * layout instruction for a stranger on a different screen.
 *
 * This is a client component wrapping SERVER-rendered children. The filter
 * panel, the grid and every product card inside it stay Server Components and
 * ship no extra JavaScript — only this wrapper and the control itself do. That
 * is the whole reason the attribute lives on a wrapper rather than being pushed
 * into the grid: the grid would have had to become a client component to read
 * it, and with it every card.
 */
export function GridColumnsScope({ initialColumns, children }: GridColumnsScopeProps) {
  const [columns, setColumnsState] = useState<MobileColumns>(initialColumns);

  const setColumns = useCallback((next: MobileColumns) => {
    /*
     * STATE-04: the cookie is an external system, written in the handler rather
     * than an effect so the choice is already stored by the time the next
     * request goes out. Same pattern as the theme toggle (PD-01).
     */
    document.cookie = `${GRID_COLUMNS_COOKIE}=${String(next)}; path=/; max-age=${String(COOKIE_MAX_AGE_SECONDS)}; samesite=lax`;

    setColumnsState(next);
  }, []);

  // PERF-05: a stable reference, so the control does not re-render on every
  // parent render.
  const value = useMemo<GridColumnsValue>(() => ({ columns, setColumns }), [columns, setColumns]);

  return (
    <GridColumnsContext.Provider value={value}>
      <div className="listing-layout" {...{ [GRID_COLUMNS_ATTRIBUTE]: String(columns) }}>
        {children}
      </div>
    </GridColumnsContext.Provider>
  );
}

export function useGridColumns(): GridColumnsValue {
  return useContext(GridColumnsContext);
}
