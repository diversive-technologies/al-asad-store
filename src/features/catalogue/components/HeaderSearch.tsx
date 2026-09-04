'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { flushSync } from 'react-dom';

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
 * Open and closed are two stacked children rather than a conditional render,
 * so closing runs the opening animation backwards instead of the field simply
 * disappearing. The hidden one carries `visibility: hidden`, which keeps it
 * out of the tab order and the accessibility tree.
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

  /**
   * Focus is moved here rather than from an effect, and `flushSync` is what
   * makes that safe.
   *
   * The two states are stacked and swapped with `visibility`, so the moment the
   * field opens the toggle button — which is what the pointer just activated and
   * what currently holds focus — becomes hidden, and the browser responds by
   * blurring it to `<body>`. An effect racing that lands focus nowhere.
   * `flushSync` commits the state change and its styles first, so by the time
   * the next line runs the browser has already done its blurring and the field
   * is genuinely focusable.
   */
  function openSearch(): void {
    flushSync(() => {
      setIsOpen(true);
    });

    inputRef.current?.focus();
  }

  /**
   * `restoreFocus` distinguishes dismissals that were a deliberate act on this
   * control — Escape, the close button — from ones that were not. Pulling focus
   * back to the search button because someone clicked a link elsewhere on the
   * page would fight the reader for their own caret.
   */
  function closeSearch(restoreFocus: boolean): void {
    flushSync(() => {
      setTerm('');
      setIsOpen(false);
    });

    if (restoreFocus) toggleRef.current?.focus();
  }

  useEffect(() => {
    if (!isOpen) return;

    // STATE-04 — the external system is the document's pointer stream, which is
    // the only way to know a press landed outside this subtree.
    function handlePointerDown(event: PointerEvent): void {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target) === true) return;

      // Not a deliberate dismissal of this control, so focus stays where the
      // reader just put it.
      closeSearch(false);
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

    closeSearch(false);
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
    closeSearch(true);
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
      {/*
       * Both children are always rendered and stacked in one grid cell; the
       * utility crossfades them and animates the width. Neither is hidden with
       * `opacity` alone — the hidden one is `visibility: hidden`, so it leaves
       * the tab order and the accessibility tree rather than becoming an
       * invisible tab stop.
       */}
      <button
        ref={toggleRef}
        type="button"
        onClick={openSearch}
        aria-label={messages.nav.search}
        aria-expanded={isOpen}
        aria-controls="header-search-field"
        className="rounded-card p-2 transition-opacity hover:opacity-70"
      >
        <Search className="size-5" aria-hidden />
      </button>

      <form
        id="header-search-field"
        onSubmit={handleSubmit}
        onKeyDown={handleFormKeyDown}
        role="search"
        className="bg-surface flex w-full items-center gap-1 rounded-full ps-3 pe-1"
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
          className="text-fg placeholder:text-fg-muted h-9 min-w-0 flex-1 bg-transparent text-sm"
        />

        <button
          type="button"
          onClick={() => {
            closeSearch(true);
          }}
          aria-label={messages.nav.closeSearch}
          className="text-fg-muted hover:text-fg hover:bg-surface-muted rounded-card shrink-0 p-1.5"
        >
          <X className="size-4" aria-hidden />
        </button>

        <button
          type="submit"
          aria-label={messages.search.submit}
          className="bg-brand-600 text-on-brand hover:bg-brand-500 shrink-0 rounded-full p-2"
        >
          <Search className="size-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
