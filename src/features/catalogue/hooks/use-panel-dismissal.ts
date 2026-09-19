'use client';

import { useState } from 'react';

import { usePathname } from 'next/navigation';

import { useBag } from '@/features/bag/contract';

/**
 * WHAT CLOSES THE SEARCH PANEL from outside it, and what deliberately does not.
 *
 * Refining does not: choosing "Boski" narrows the products in place, because
 * someone refining a search has not finished searching. Everything that takes
 * the reader somewhere else does.
 *
 * Two of those cannot be handled at the control that caused them. A product card
 * navigates, and the quick add opens the bag — both from inside `ProductCard`,
 * which knows nothing about this panel and should not. So the panel's OWNER
 * watches for the two OUTCOMES instead: the path changed, or the bag opened over
 * it.
 *
 * Adjusted during render rather than in an effect, the same way the bag provider
 * closes itself on a route change: this is derived from a value changing, not a
 * synchronisation with anything outside React, and an effect would paint the
 * stale open panel once before closing it. That is also why `onLeave` may set
 * only the CALLING component's own state. It used to run inside the panel and
 * set its owner's, which React refuses to do during another component's render
 * ("Cannot update a component while rendering a different component").
 */
export function usePanelDismissal(isOpen: boolean, onLeave: () => void): void {
  const pathname = usePathname();
  const { isOpen: isBagOpen } = useBag();
  const [lastPathname, setLastPathname] = useState(pathname);
  const [wasBagOpen, setWasBagOpen] = useState(isBagOpen);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (isOpen) onLeave();
  }

  if (isBagOpen !== wasBagOpen) {
    setWasBagOpen(isBagOpen);
    if (isBagOpen && isOpen) onLeave();
  }
}
