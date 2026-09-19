'use client';

import { useEffect, useState, type RefObject } from 'react';

import { ROUTES } from '@/config/routes';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { Locale } from '@/i18n/locales';

import type { FacetKey, SearchRefinement, Suggestions } from '../schemas/search.schema';
import { usePanelExits, type PanelExits } from './use-panel-exits';
import { usePanelSuggestions } from './use-panel-suggestions';
import { useSearchRefinements } from './use-search-refinements';

/** How long after the last keystroke the suggestions are asked for. */
const DEBOUNCE_MS = 200;

/**
 * The two elements the panel drives from outside React: the dialog it opens with
 * `showModal()`, and the field it focuses when it does. The component owns them;
 * they are handed in rather than handed back, so nothing drawn from this hook's
 * answer reads a ref during render (`react-hooks/refs`).
 */
export interface SearchPanelElements {
  readonly dialog: RefObject<HTMLDialogElement | null>;
  readonly input: RefObject<HTMLInputElement | null>;
}

export interface SearchPanel extends PanelExits {
  readonly term: string;
  readonly setTerm: (term: string) => void;
  /** The words the suggestions were asked for — what was typed, settled and trimmed. */
  readonly settledTerm: string;
  readonly applied: readonly SearchRefinement[];
  readonly toggleRefinement: (facet: FacetKey, value: string) => void;
  readonly suggestions: Suggestions | undefined;
  readonly isPending: boolean;
  /** "View all" once something is typed: the panel's whole question, as a results page. */
  readonly viewMatches: () => void;
}

/**
 * MOD-05 layer 2 — the search panel's state, its one read and its exits. It
 * renders nothing; `SearchOverlay` draws what this returns.
 *
 * The exits that start OUTSIDE the panel — a card that navigates, a quick add
 * that opens the bag — are its owner's to see (`HeaderSearch`,
 * `usePanelDismissal`), which closes it and draws a fresh one, so the words and
 * the refinements go with that search as they do with every other page exit.
 */
export function useSearchPanel(
  isOpen: boolean,
  onClose: () => void,
  locale: Locale,
  elements: SearchPanelElements,
): SearchPanel {
  const [term, setTerm] = useState('');
  const settledTerm = useDebouncedValue(term, DEBOUNCE_MS).trim();

  useDialogOpen(elements, isOpen);

  const refinements = useSearchRefinements(settledTerm);
  const { queryString, suggestions } = usePanelSuggestions(
    settledTerm,
    refinements.applied,
    locale,
    isOpen,
  );

  const exits = usePanelExits(onClose, {
    term: () => {
      setTerm('');
    },
    refinements: refinements.reset,
  });

  return {
    ...exits,
    term,
    setTerm,
    settledTerm,
    applied: refinements.applied,
    toggleRefinement: (facet, value) => {
      refinements.toggle(facet, value, suggestions.data?.refinements ?? []);
    },
    suggestions: suggestions.data,
    isPending: suggestions.isPending,
    viewMatches: () => {
      exits.leave(`${ROUTES.search}${queryString}`);
    },
  };
}

/**
 * STATE-04 — the external system is the DIALOG element, whose open state lives
 * in the DOM rather than in React. `showModal()` is the only way to get the top
 * layer, so the two are synchronised here.
 */
function useDialogOpen({ dialog, input }: SearchPanelElements, isOpen: boolean): void {
  useEffect(() => {
    const element = dialog.current;
    if (element === null) return;

    if (isOpen && !element.open) {
      element.showModal();
      input.current?.focus();
    }

    if (!isOpen && element.open) element.close();
  }, [dialog, input, isOpen]);
}
