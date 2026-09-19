'use client';

import type { RefObject } from 'react';

import type { Messages } from '@/i18n/messages/en';
import { Search, X } from '@/lib/vendor/icons';

import type { SearchPanel } from '../hooks/use-search-panel';

export interface SearchOverlayBarProps {
  panel: SearchPanel;
  /** The field the panel focuses as it opens, and the clear button hands focus back to. */
  inputRef: RefObject<HTMLInputElement | null>;
  messages: Messages;
}

/** The search panel's bar: the field, its clear button, and the panel's close. */
export function SearchOverlayBar({ panel, inputRef, messages }: SearchOverlayBarProps) {
  const t = messages.search;

  return (
    <div className="search-overlay-bar">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          panel.search(panel.term);
        }}
        className="search-overlay-field"
      >
        <Search className="text-fg-muted h-4 w-4 shrink-0" aria-hidden />

        <label htmlFor="search-overlay-input" className="sr-only">
          {t.inputLabel}
        </label>
        <input
          ref={inputRef}
          id="search-overlay-input"
          type="search"
          value={panel.term}
          onChange={(event) => {
            panel.setTerm(event.target.value);
          }}
          placeholder={t.overlayPlaceholder}
          className="text-fg placeholder:text-fg-muted h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
        />

        {panel.term.length === 0 ? null : (
          <button
            type="button"
            onClick={() => {
              panel.setTerm('');
              inputRef.current?.focus();
            }}
            aria-label={t.clear}
            className="text-fg-muted hover:text-fg shrink-0"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </form>

      <button
        type="button"
        onClick={panel.close}
        aria-label={t.close}
        className="text-fg hover:text-fg-muted absolute end-4 top-4"
      >
        <X className="h-6 w-6" aria-hidden />
      </button>
    </div>
  );
}
