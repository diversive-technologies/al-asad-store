'use client';

import { useCallback, useState } from 'react';

import { usePathname } from 'next/navigation';

export interface BagPanelState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

/**
 * Whether the slide-in bag is open — one boolean, and the rule that closes it.
 *
 * The panel lives in the root layout, so it survives a route change: a customer
 * following a product link out of their bag would otherwise land on the product
 * page with a modal still over it and the page behind it inert. Closing it here
 * covers every link inside the panel at once, including the ones inside each bag
 * line.
 *
 * Adjusted DURING RENDER rather than in an effect. This is React's own "you might
 * not need an effect" case — state derived from a prop-like value changing — and
 * an effect would render the stale open panel once before closing it, as well as
 * tripping `react-hooks/set-state-in-effect`.
 */
export function useBagPanel(): BagPanelState {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsOpen(false);
  }

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return { isOpen, open, close };
}
