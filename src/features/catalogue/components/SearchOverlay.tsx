'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { queryKeys } from '@/lib/api/query-keys';
import { unwrap } from '@/lib/result';
import { formatTemplate } from '@/lib/utils/format';
import { Search, X } from '@/lib/vendor/icons';

import { fetchSuggestions } from '../api/fetch-suggestions';
import { EMPTY_QUERY, toQueryString } from '../lib/search-params';
import { ProductCard } from './ProductCard';
import { SuggestionTerms } from './SuggestionTerms';

export interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  locale: Locale;
  messages: Messages;
}

/** How long after the last keystroke the suggestions are asked for. */
const DEBOUNCE_MS = 200;
/** How long the panel takes to leave, matched by `search-overlay` in globals.css. */
const EXIT_MS = 180;

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
 */
export function SearchOverlay({ isOpen, onClose, locale, messages }: SearchOverlayProps) {
  const t = messages.search;
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  /*
   * STATE-04 — the external system is the DIALOG element, whose open state
   * lives in the DOM rather than in React. `showModal()` is the only way to get
   * the top layer, so the two have to be synchronised here.
   */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      inputRef.current?.focus();
    }

    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  // STATE-04 — the external system is the clock; the debounce keeps a request
  // off every keystroke without making the field feel laggy.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(term.trim());
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [term]);

  const suggestions = useQuery({
    queryKey: queryKeys.catalogue.suggestions(debounced, locale),
    queryFn: ({ signal }) => unwrap(fetchSuggestions(debounced, locale, signal)),
    /*
     * Enabled even for an EMPTY term, which is the change this panel needed:
     * the backend answers a blank box with what it wants merchandised.
     */
    enabled: isOpen,
    staleTime: 60 * 1000,
    retry: false,
  });

  function close(): void {
    // The panel animates out, so the element stays until the transition ends.
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, EXIT_MS);
  }

  function runSearch(raw: string): void {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return;

    onClose();
    setTerm('');
    // Built through the canonical serialiser, so a search typed here and one
    // typed on the results page produce the same address (PD-01).
    router.push(`${ROUTES.search}${toQueryString({ ...EMPTY_QUERY, term: trimmed })}`);
  }

  const data = suggestions.data;
  const isDefault = debounced.length === 0;
  const products = data?.products ?? [];

  return (
    <dialog
      ref={dialogRef}
      data-closing={isClosing}
      className="search-overlay"
      // A11Y-08: `cancel` is Escape. The panel owns its exit animation, so the
      // default close is prevented and routed through the same path as the X.
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) close();
      }}
      aria-label={t.title}
    >
      <div className="search-overlay-bar">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            runSearch(term);
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
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
            }}
            placeholder={t.overlayPlaceholder}
            className="text-fg placeholder:text-fg-muted h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
          />

          {term.length === 0 ? null : (
            <button
              type="button"
              onClick={() => {
                setTerm('');
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
          onClick={close}
          aria-label={t.close}
          className="text-fg hover:text-fg-muted absolute end-4 top-4"
        >
          <X className="h-6 w-6" aria-hidden />
        </button>
      </div>

      <div className="search-overlay-body">
        <SuggestionTerms
          terms={data?.terms ?? []}
          heading={isDefault ? t.trendingHeading : t.suggestionsHeading}
          highlight={debounced}
          onSelect={runSearch}
        />

        <section aria-labelledby="search-products-heading">
          <div className="search-overlay-heading">
            <h2 id="search-products-heading">
              {isDefault ? t.bestSellersHeading : t.productsHeading}
            </h2>

            {!isDefault ? null : (
              <a href={ROUTES.catalogue.list} className="text-fg text-xs underline">
                {t.viewAll}
              </a>
            )}
          </div>

          {/* A11Y-05: the count is announced, because the list changes as you type. */}
          <p aria-live="polite" className="sr-only">
            {formatTemplate(t.resultCount, { count: String(products.length) })}
          </p>

          {products.length === 0 ? (
            <p className="text-fg-muted py-8 text-sm">
              {suggestions.isPending ? messages.common.loading : t.noResultsHeading}
            </p>
          ) : (
            <div className="search-overlay-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  entry={{ product, availability: null }}
                  locale={locale}
                  messages={messages}
                  sizes="(min-width: 64rem) 16rem, 45vw"
                />
              ))}
            </div>
          )}

          {isDefault || products.length === 0 ? null : (
            <div className="search-overlay-footer">
              <button
                type="button"
                onClick={() => {
                  runSearch(debounced);
                }}
                className="text-fg text-sm underline"
              >
                {formatTemplate(t.viewAllTerm, { term: debounced })}
              </button>
            </div>
          )}
        </section>
      </div>
    </dialog>
  );
}
