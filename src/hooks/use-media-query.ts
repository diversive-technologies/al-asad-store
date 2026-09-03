'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * SSOT-00 — extracted on its second use: the colour-scheme preference and the
 * reduced-motion preference are the same problem.
 *
 * STATE-04 — a media query is an external system, and `useSyncExternalStore` is
 * the primitive built for exactly that: it subscribes without the
 * setState-inside-an-effect pattern, and its server snapshot keeps hydration
 * consistent instead of producing a mismatch on the first paint.
 *
 * The server snapshot is always `false`. A request cannot know what the reader's
 * device prefers, so the server renders the unset case and React re-renders once
 * the real value is available on the client.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void): (() => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => {
        list.removeEventListener('change', onChange);
      };
    },
    [query],
  );

  const getSnapshot = useCallback((): boolean => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
