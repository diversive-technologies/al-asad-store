'use client';

import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { flushSync } from 'react-dom';

import { useQuery } from '@tanstack/react-query';

import { ROUTES } from '@/config/routes';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { queryKeys } from '@/lib/api/query-keys';
import { unwrap } from '@/lib/result';
import { Search, X } from '@/lib/vendor/icons';

import { fetchSuggestions } from '../api/fetch-suggestions';
import { EMPTY_QUERY, toQueryString } from '../lib/search-params';
import {
  NO_ACTIVE_OPTION,
  nextActiveIndex,
  toSuggestionOptions,
  type SuggestionDestination,
  type SuggestionOption,
} from '../lib/suggestions';
import { SearchSuggestions } from './SearchSuggestions';

export interface HeaderSearchProps {
  locale: Locale;
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
/** Below this, a suggestion request costs more than it can possibly return. */
const MIN_TERM_LENGTH = 2;

/** Section 30.1 budgets suggest under 100ms; this keeps one search to one request. */
const DEBOUNCE_MS = 180;

const LISTBOX_ID = 'header-search-listbox';

function optionId(index: number): string {
  return `${LISTBOX_ID}-option-${String(index)}`;
}

export function HeaderSearch({ locale, messages }: HeaderSearchProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState('');

  const [activeIndex, setActiveIndex] = useState(NO_ACTIVE_OPTION);
  // Escape dismisses the list before it dismisses the field, so the two need
  // separate state — the field can be open with the list deliberately closed.
  const [isListDismissed, setIsListDismissed] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  const debouncedTerm = useDebouncedValue(term.trim(), DEBOUNCE_MS);
  const canSuggest = isOpen && debouncedTerm.length >= MIN_TERM_LENGTH;

  /*
   * DATA-05: fetched through TanStack Query, never a `useEffect`. DATA-03a: the
   * `Result` is bridged with `unwrap`, the one sanctioned adapter, because Query
   * reports failure only through a rejected promise.
   *
   * DATA-09 — caching intent: suggestions are keystroke-scoped, so they are held
   * briefly and only to make re-typing and backspacing free. `queryKey` carries
   * the locale, so the two languages can never serve each other's results.
   */
  const suggestionsQuery = useQuery({
    queryKey: queryKeys.catalogue.suggestions(debouncedTerm, locale),
    queryFn: ({ signal }) => unwrap(fetchSuggestions(debouncedTerm, locale, signal)),
    enabled: canSuggest,
    staleTime: 30_000,
    // A failed suggestion is not worth a retry storm; the reader can still submit.
    retry: false,
  });

  const options = useMemo(
    () => (suggestionsQuery.data === undefined ? [] : toSuggestionOptions(suggestionsQuery.data)),
    [suggestionsQuery.data],
  );

  // STATE-03: derived during render, never mirrored into state.
  const isListOpen = isOpen && !isListDismissed && options.length > 0;
  const activeOption: SuggestionOption | null =
    (isListOpen && activeIndex >= 0 ? options[activeIndex] : undefined) ?? null;

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
  /**
   * Every dismissal resets the list, so reopening never restores a stale row.
   *
   * `useCallback` here is for correctness, not speed: `closeSearch` is called
   * from the outside-press effect, so its identity has to be stable or the
   * listener is torn down and re-attached on every render — and the dependency
   * array cannot honestly list it otherwise.
   */
  const resetList = useCallback((): void => {
    setActiveIndex(NO_ACTIVE_OPTION);
    setIsListDismissed(false);
  }, []);

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
      resetList();
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
  const closeSearch = useCallback(
    (restoreFocus: boolean): void => {
      flushSync(() => {
        setTerm('');
        resetList();
        setIsOpen(false);
      });

      if (restoreFocus) toggleRef.current?.focus();
    },
    [resetList],
  );

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
  }, [isOpen, closeSearch]);

  /** The one navigation path: the submit button, Enter, and every suggestion. */
  function runSearch(rawTerm: string): void {
    const trimmed = rawTerm.trim();
    // Submitting an empty box would land on a results page for nothing.
    if (trimmed.length === 0) return;

    closeSearch(false);
    // Built through the canonical serialiser, so a search typed here and one
    // typed on the results page produce the same address (PD-01).
    router.push(`${ROUTES.search}${toQueryString({ ...EMPTY_QUERY, term: trimmed })}`);
  }

  /**
   * Follows a chosen row to wherever it goes.
   *
   * TS-07: exhaustive over the destination union, so a third kind of suggestion
   * becomes a compile error here rather than a row that silently does nothing.
   */
  function go(destination: SuggestionDestination): void {
    switch (destination.kind) {
      case 'SEARCH':
        runSearch(destination.term);
        return;
      case 'PRODUCT':
        closeSearch(false);
        router.push(ROUTES.catalogue.detail(destination.slug));
        return;
    }
  }

  /** The highlighted row wins over the raw text: it is what the reader can see. */
  function submitCurrent(): void {
    if (activeOption === undefined || activeOption === null) {
      runSearch(term);
      return;
    }
    go(activeOption.destination);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    submitCurrent();
  }

  function handleFormKeyDown(event: KeyboardEvent<HTMLFormElement>): void {
    if (event.key !== 'Escape') return;

    /*
     * The ARIA combobox pattern: Escape dismisses the LIST first and the field
     * only once the list is already gone. Collapsing everything on the first
     * press would throw away a half-typed term just because the reader wanted
     * the suggestions out of the way.
     */
    if (isListOpen) {
      setIsListDismissed(true);
      setActiveIndex(NO_ACTIVE_OPTION);
      return;
    }

    closeSearch(true);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!isListOpen) return;

      // Stops the caret jumping to either end of the text while arrowing rows.
      event.preventDefault();
      setActiveIndex(nextActiveIndex(activeIndex, event.key === 'ArrowDown' ? 1 : -1, options.length));
      return;
    }

    if (event.key !== 'Enter') return;

    /*
     * Enter is handled explicitly rather than left to the browser's implicit
     * form submission. Both routes end in `runSearch`, so behaviour is
     * identical — but implicit submission is a default action, and default
     * actions are exactly what a programmatically driven field does not get,
     * which left this path unverifiable. `preventDefault` also guarantees the
     * two can never both fire for one keystroke.
     */
    event.preventDefault();
    submitCurrent();
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
        {/*
          * The ARIA combobox contract. The input owns the relationship: it says
          * a list exists (`aria-controls`), whether it is showing
          * (`aria-expanded`), and which row is current
          * (`aria-activedescendant`) — all without focus ever leaving the field.
          */}
        <input
          ref={inputRef}
          id="header-search-input"
          name="q"
          type="search"
          role="combobox"
          aria-expanded={isListOpen}
          aria-controls={LISTBOX_ID}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            // Typing revives a list the reader dismissed, and invalidates the
            // row they had highlighted.
            resetList();
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

      {/*
       * A sibling of the form, not a child of it: the form carries
       * `overflow: hidden` so its contents clip while it collapses, which would
       * clip the dropdown too. Still inside the wrapper, so the outside-press
       * dismissal correctly counts a click on a suggestion as "inside".
       */}
      {isListOpen ? (
        <SearchSuggestions
          options={options}
          activeIndex={activeIndex}
          listboxId={LISTBOX_ID}
          optionId={optionId}
          onSelect={(option) => {
            go(option.destination);
          }}
          locale={locale}
          messages={messages}
        />
      ) : null}
    </div>
  );
}
