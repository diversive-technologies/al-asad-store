'use client';

import { useEffect, useState } from 'react';

/**
 * Trails a fast-changing value by a fixed delay.
 *
 * The type-ahead's reason for existing: a request per keystroke would spend
 * section 30.1's 100ms budget many times over for one search, and every
 * intermediate response would be discarded anyway. Debouncing the *value* rather
 * than the request keeps the query key stable, so TanStack Query can serve a
 * re-typed term from cache instead of refetching it.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    // STATE-04 — the external system is the browser's timer. The cleanup is what
    // makes this a debounce rather than a queue of stale updates.
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debounced;
}
