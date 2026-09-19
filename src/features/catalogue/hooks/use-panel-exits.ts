'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { ROUTES } from '@/config/routes';

import { EMPTY_QUERY, toQueryString } from '../lib/search-params';

/** How long the panel takes to leave, matched by `search-overlay` in globals.css. */
const EXIT_MS = 180;

export interface PanelExits {
  readonly isClosing: boolean;
  /** The X, Escape and the backdrop: the panel animates out. */
  readonly close: () => void;
  /** Leaving for somewhere else: closed at once, with nothing carried over. */
  readonly dismiss: () => void;
  readonly leave: (href: string) => void;
  /** A term typed or chosen: a fresh search, so no refinement is carried. */
  readonly search: (raw: string) => void;
}

/** What leaving the panel empties: the refinements always, the words only when leaving it for a page. */
export interface PanelResets {
  readonly refinements: () => void;
  readonly term: () => void;
}

/**
 * The ways out of the search panel that start inside it.
 *
 * Closing it with the X keeps the words for next time and drops what was
 * narrowed; leaving it for a page drops both, because that search is done.
 */
export function usePanelExits(onClose: () => void, resets: PanelResets): PanelExits {
  const router = useRouter();
  const [isClosing, setIsClosing] = useState(false);

  function dismiss(): void {
    onClose();
    resets.term();
    resets.refinements();
  }

  function leave(href: string): void {
    dismiss();
    router.push(href);
  }

  return {
    isClosing,
    close: () => {
      // The panel animates out, so the element stays until the transition ends.
      setIsClosing(true);
      setTimeout(() => {
        setIsClosing(false);
        resets.refinements();
        onClose();
      }, EXIT_MS);
    },
    dismiss,
    leave,
    search: (raw) => {
      const trimmed = raw.trim();
      if (trimmed.length === 0) return;
      // Built through the canonical serialiser, so a search typed here and one
      // typed on the results page produce the same address (PD-01).
      leave(`${ROUTES.search}${toQueryString({ ...EMPTY_QUERY, term: trimmed })}`);
    },
  };
}
