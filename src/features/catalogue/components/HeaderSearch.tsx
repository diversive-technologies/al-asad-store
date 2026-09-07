'use client';

import { useState } from 'react';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { Search } from '@/lib/vendor/icons';

import { SearchOverlay } from './SearchOverlay';

export interface HeaderSearchProps {
  locale: Locale;
  messages: Messages;
}

/**
 * The header's search control: a button, and the panel it opens.
 *
 * It used to morph into an inline field with a dropdown listbox beneath it.
 * That shape could hold a list of words and nothing more — §28.1's search now
 * shows four real product cards with photography, price and quick add, and a
 * field-width menu has nowhere to put them. `SearchOverlay` is the panel; this
 * is the button.
 *
 * No colour is pinned here: over the hero the header sets `color: on-media`,
 * and anything carrying its own `text-*` stops following it.
 */
export function HeaderSearch({ locale, messages }: HeaderSearchProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
        }}
        // A11Y-04: an icon-only control still has to say what it is.
        aria-label={messages.search.inputLabel}
        aria-expanded={isOpen}
        className="focus-visible:ring-brand-500 rounded-full p-2 transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:outline-none"
      >
        <Search className="h-5 w-5" aria-hidden />
      </button>

      <SearchOverlay
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        locale={locale}
        messages={messages}
      />
    </>
  );
}
