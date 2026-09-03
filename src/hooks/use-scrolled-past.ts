'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Whether the page has been scrolled beyond `threshold` pixels.
 *
 * STATE-04 — the scroll position is an external system, and
 * `useSyncExternalStore` subscribes to it without the setState-inside-an-effect
 * pattern. The snapshot is a boolean rather than the raw offset on purpose:
 * React skips the re-render entirely while the answer is unchanged, so a
 * fast scroll costs one render at the crossing point instead of one per frame.
 *
 * The server snapshot is `false` — a request has no scroll position, and the
 * top of the page is where every reader starts.
 */
export function useScrolledPast(threshold: number): boolean {
  const subscribe = useCallback((onChange: () => void): (() => void) => {
    // Passive: this listener never calls preventDefault, and saying so keeps
    // scrolling off the main thread's critical path.
    window.addEventListener('scroll', onChange, { passive: true });
    return () => {
      window.removeEventListener('scroll', onChange);
    };
  }, []);

  const getSnapshot = useCallback((): boolean => window.scrollY > threshold, [threshold]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
