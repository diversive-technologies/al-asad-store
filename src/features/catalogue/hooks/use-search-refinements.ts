'use client';

import { useState } from 'react';

import type { FacetKey, SearchRefinement } from '../schemas/search.schema';

export interface SearchRefinements {
  readonly applied: readonly SearchRefinement[];
  /**
   * Lifts a refinement already applied, or applies one from `offered` — what the
   * backend's latest answer offered, passed at the moment of the press.
   */
  readonly toggle: (facet: FacetKey, value: string, offered: readonly SearchRefinement[]) => void;
  readonly reset: () => void;
}

/**
 * The filters applied INSIDE the search panel.
 *
 * STATE-01 — local, because they belong to this panel while it is open and to
 * nothing else. They are deliberately NOT in the URL: the panel is a modal, and
 * writing every tentative refinement into the address would fill the reader's
 * history with searches they were still composing. "View all" is where a panel
 * query becomes a page address.
 *
 * Only something the backend offered can be applied; there is no way to invent
 * a facet value here, and no reason to.
 */
export function useSearchRefinements(term: string): SearchRefinements {
  const [applied, setApplied] = useState<readonly SearchRefinement[]>([]);

  /*
   * A new set of words is a new search, so what was narrowed is dropped. Left
   * standing, a "Boski" filter would silently apply to the next thing typed and
   * return nothing — an empty panel with no visible cause. Adjusted during
   * render rather than in an effect: it is derived from a value changing.
   */
  const [lastTerm, setLastTerm] = useState(term);

  if (term !== lastTerm) {
    setLastTerm(term);
    if (applied.length > 0) setApplied([]);
  }

  function toggle(facet: FacetKey, value: string, offered: readonly SearchRefinement[]): void {
    const isMatch = (one: SearchRefinement): boolean => one.key === facet && one.value === value;

    setApplied((current) => {
      if (current.some(isMatch)) return current.filter((one) => !isMatch(one));

      const offer = offered.find(isMatch);
      return offer === undefined ? current : [...current, offer];
    });
  }

  function reset(): void {
    setApplied([]);
  }

  return { applied, toggle, reset };
}
