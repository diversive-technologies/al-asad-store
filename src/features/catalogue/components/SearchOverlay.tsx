'use client';

import { useRef } from 'react';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import { useSearchPanel } from '../hooks/use-search-panel';
import { SearchOverlayBar } from './SearchOverlayBar';
import { SearchOverlayProducts } from './SearchOverlayProducts';
import { SearchRefinements } from './SearchRefinements';
import { SuggestionTerms } from './SuggestionTerms';

export interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  locale: Locale;
  messages: Messages;
}

/**
 * How many terms the column shows.
 *
 * Five while the box is empty, because trending terms are the whole answer
 * there. Three once something is typed, to leave room for the refinements
 * underneath — which narrow the search the customer is actually making.
 */
const TRENDING_LIMIT = 5;
const SUGGESTION_LIMIT = 3;

/**
 * §28.1's search, as a full-width panel rather than a dropdown.
 *
 * A dropdown can hold a list of words. This holds MERCHANDISE — four real
 * product cards, with their photography, price and quick add — and that does
 * not fit under a header field. It is the same reasoning as the bag panel:
 * built on the native `<dialog>` with `showModal()`, so the focus trap, the
 * `Escape` key, the top layer and the inert background come from the platform
 * rather than from several hundred lines of the subtlest code in the project
 * (A11Y-08, BASE-01).
 *
 * The panel is never empty. Before a single keystroke it shows the terms the
 * operator wants searched and the products they want seen; after one it shows
 * matching terms and matching products. Same shape, different contents, so the
 * layout does not jump when the first character lands.
 *
 * MOD-05 layer 3 — every piece of state and every exit is `useSearchPanel`'s.
 */
export function SearchOverlay({ isOpen, onClose, locale, messages }: SearchOverlayProps) {
  const t = messages.search;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panel = useSearchPanel(isOpen, onClose, locale, { dialog: dialogRef, input: inputRef });
  const isDefault = panel.settledTerm.length === 0;

  return (
    <dialog
      ref={dialogRef}
      data-closing={panel.isClosing}
      className="search-overlay"
      // A11Y-08: `cancel` is Escape. The panel owns its exit animation, so the
      // default close is prevented and routed through the same path as the X.
      onCancel={(event) => {
        event.preventDefault();
        panel.close();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) panel.close();
      }}
      aria-label={t.title}
    >
      <SearchOverlayBar panel={panel} inputRef={inputRef} messages={messages} />

      <div className="search-overlay-body">
        {/*
         * The left column, in two parts once something has been typed.
         *
         * Suggestions COMPLETE a half-typed word — someone typing "bos" may not
         * know "boski" is a fabric — which is a job a filter cannot do, so they
         * stay. But three, not five: the refinements below them are the more
         * useful half of the column once a term exists, and five terms pushed
         * them under the fold.
         */}
        <div className="min-w-0">
          <SuggestionTerms
            terms={(panel.suggestions?.terms ?? []).slice(
              0,
              isDefault ? TRENDING_LIMIT : SUGGESTION_LIMIT,
            )}
            heading={isDefault ? t.trendingHeading : t.suggestionsHeading}
            highlight={panel.settledTerm}
            onSelect={panel.search}
          />

          <SearchRefinements
            locale={locale}
            refinements={panel.suggestions?.refinements ?? []}
            applied={panel.applied}
            heading={t.refinementsHeading}
            onToggle={panel.toggleRefinement}
          />
        </div>

        <SearchOverlayProducts panel={panel} locale={locale} messages={messages} />
      </div>
    </dialog>
  );
}
