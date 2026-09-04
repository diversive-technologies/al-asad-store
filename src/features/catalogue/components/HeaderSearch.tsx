'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';
import { Search, X } from '@/lib/vendor/icons';

import { EMPTY_QUERY, toQueryString } from '../lib/search-params';

export interface HeaderSearchProps {
  messages: Messages;
}

/**
 * The header search: one control in two states, not a link to a search page.
 *
 * MOD-01 — this lives in `features/catalogue`, not `components/layout`, because
 * it depends on the catalogue's URL-state module and `components/` may not
 * import from `features/`. It reaches the header the same way the locale
 * switcher does: as a slot composed in `app/layout.tsx`, which sits above both
 * layers (CMP-08).
 *
 * Submitting navigates rather than fetching, and the address it builds goes
 * through the canonical serialiser — so a search typed here and a search typed
 * on the results page produce byte-identical URLs (PD-01).
 *
 * A11Y: the collapsed control is a real `<button>` that reports `aria-expanded`
 * and owns the field via `aria-controls`. Opening moves focus into the input,
 * Escape closes and returns focus to the button, and a pointer press anywhere
 * outside dismisses it. That is the A11Y-08 contract for a popover, met without
 * a focus trap — the field is inline in the header rather than a modal layer,
 * so trapping focus inside it would strand keyboard users.
 */
export function HeaderSearch({ messages }: HeaderSearchProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState('');

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    // STATE-04 — the external system is DOM focus. Nothing here transforms
    // state; it moves the caret to match what the interface just did.
    if (isOpen) {
      inputRef.current?.focus();
    } else if (wasOpen.current) {
      // Only after a real close, never on first mount — otherwise the header
      // would steal focus from the page on every load.
      toggleRef.current?.focus();
    }

    wasOpen.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // STATE-04 — the external system is the document's pointer stream, which is
    // the only way to know a press landed outside this subtree.
    function handlePointerDown(event: PointerEvent): void {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target) === true) return;

      setIsOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  /** The one navigation path, shared by the submit button and the Enter key. */
  function runSearch(): void {
    const trimmed = term.trim();
    // Submitting an empty box would land on a results page for nothing.
    if (trimmed.length === 0) return;

    setIsOpen(false);
    // Built through the canonical serialiser, so a search typed here and one
    // typed on the results page produce the same address (PD-01).
    router.push(`${ROUTES.search}${toQueryString({ ...EMPTY_QUERY, term: trimmed })}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    runSearch();
  }

  function handleFormKeyDown(event: KeyboardEvent<HTMLFormElement>): void {
    if (event.key !== 'Escape') return;

    // Escape abandons the search rather than merely hiding the box, so
    // reopening does not resume someone else's half-typed term. Handled on the
    // form so it works from the field and from either button.
    setTerm('');
    setIsOpen(false);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== 'Enter') return;

    /*
     * Enter is handled explicitly rather than left to the browser's implicit
     * form submission. Both routes end in `runSearch`, so behaviour is
     * identical — but implicit submission is a default action, and default
     * actions are exactly what is missing when the field is driven
     * programmatically. Suppressing it here makes the Enter path deterministic
     * and testable instead of environment-dependent, and `preventDefault`
     * guarantees the two paths can never both fire for one keystroke.
     */
    event.preventDefault();
    runSearch();
  }

  return (
    <div ref={rootRef} data-open={isOpen} className="header-search">
      {isOpen ? (
        <form
          id="header-search-field"
          onSubmit={handleSubmit}
          onKeyDown={handleFormKeyDown}
          role="search"
          className="border-border bg-surface flex w-full items-center gap-1 rounded-full border ps-3 pe-1"
        >
          {/* FORM-05 / A11Y-04: labelled, even though the label is not drawn. */}
          <label htmlFor="header-search-input" className="sr-only">
            {messages.search.inputLabel}
          </label>
          <input
            ref={inputRef}
            id="header-search-input"
            name="q"
            type="search"
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={messages.search.placeholder}
            autoComplete="off"
            className="text-fg placeholder:text-fg-muted h-9 min-w-0 flex-1 bg-transparent text-sm outline-none"
          />

          <button
            type="button"
            onClick={() => {
              setTerm('');
              setIsOpen(false);
            }}
            aria-label={messages.nav.closeSearch}
            className="rounded-card hover:bg-surface-muted focus-visible:ring-brand-500 p-1.5 focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="size-4" aria-hidden />
          </button>

          <button
            type="submit"
            aria-label={messages.search.submit}
            className="bg-brand-600 text-on-brand hover:bg-brand-500 focus-visible:ring-brand-500 rounded-full p-2 focus-visible:ring-2 focus-visible:outline-none"
          >
            <Search className="size-4" aria-hidden />
          </button>
        </form>
      ) : (
        <button
          ref={toggleRef}
          type="button"
          onClick={() => {
            setIsOpen(true);
          }}
          aria-label={messages.nav.search}
          aria-expanded={false}
          aria-controls="header-search-field"
          className="rounded-card p-2 transition-opacity hover:opacity-70"
        >
          <Search className="size-5" aria-hidden />
        </button>
      )}
    </div>
  );
}
