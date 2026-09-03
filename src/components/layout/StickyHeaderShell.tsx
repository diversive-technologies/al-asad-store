'use client';

import type { ReactNode } from 'react';

import { useScrolledPast } from '@/hooks/use-scrolled-past';

export interface StickyHeaderShellProps {
  children: ReactNode;
}

/** How far the reader scrolls before the bar stops being transparent. */
const SOLID_AFTER_PX = 48;

/**
 * The bar floats over the hero film, then turns solid once the reader scrolls.
 *
 * MOD-06 / PERF-01 — only the shell is a Client Component. Everything inside it
 * — the wordmark, the navigation, the links — stays server-rendered and passes
 * straight through as `children`, so scroll behaviour costs a few lines of
 * client JavaScript rather than the whole header.
 *
 * The colour swap is driven by CSS from the `data-scrolled` attribute rather
 * than by class names computed here, which is what lets those server-rendered
 * children change colour without any of them knowing about scrolling.
 */
export function StickyHeaderShell({ children }: StickyHeaderShellProps) {
  const isScrolled = useScrolledPast(SOLID_AFTER_PX);

  return (
    <header data-scrolled={isScrolled} className="header-surface z-header fixed inset-x-0 top-0">
      {children}
    </header>
  );
}
