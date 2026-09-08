'use client';

import { Check } from '@/lib/vendor/icons';
import { cn } from '@/lib/utils/cn';

import type { FacetKey } from '../schemas/search.schema';
import type { SearchRefinement } from '../schemas/search.schema';

export interface SearchRefinementsProps {
  refinements: readonly SearchRefinement[];
  /** What is already applied, so each one can show as chosen and be undone. */
  applied: readonly SearchRefinement[];
  heading: string;
  onToggle: (facet: FacetKey, value: string) => void;
}

/**
 * The mini filter inside the search panel: ways to narrow what was just typed.
 *
 * These are BUTTONS, not links, and that is the whole design. Choosing one
 * re-asks the backend and narrows the products in the panel — four become two —
 * rather than navigating to the results page and closing the panel underneath
 * the reader. Someone refining a search has not finished searching.
 *
 * Flat and ranked rather than grouped under Fabric / Colour / Type headings: the
 * panel gives this one narrow column, and three headings plus their values would
 * spend most of it on labels rather than on choices.
 *
 * The applied ones are listed FIRST and separately. A filter you cannot see is a
 * filter you cannot undo, and the backend stops offering a value once it is
 * chosen — picking it again would change nothing, so it is not in `refinements`
 * any more and has to be carried here.
 */
export function SearchRefinements({
  refinements,
  applied,
  heading,
  onToggle,
}: SearchRefinementsProps) {
  // Nothing to narrow and nothing narrowed: before a term is typed, or when a
  // degraded index has no counts. The section does not render at all.
  if (refinements.length === 0 && applied.length === 0) return null;

  return (
    <section aria-labelledby="search-refinements-heading" className="mt-6 min-w-0">
      <div className="search-overlay-heading">
        <h2 id="search-refinements-heading">{heading}</h2>
      </div>

      <ul className="mt-2 flex flex-wrap gap-2">
        {[...applied, ...refinements].map((entry) => {
          const isApplied = applied.some(
            (one) => one.key === entry.key && one.value === entry.value,
          );

          return (
            // CMP-10: facet and value together are the domain key — the same
            // label can appear under two facets.
            <li key={`${entry.key}:${entry.value}`}>
              <button
                type="button"
                // A11Y-02: a filter is a switch, and `aria-pressed` is what says
                // so. These are not locations, so `aria-current` would be wrong.
                aria-pressed={isApplied}
                onClick={() => {
                  onToggle(entry.key, entry.value);
                }}
                className={cn(
                  'focus-visible:ring-brand-500 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none',
                  isApplied
                    ? 'border-brand-600 bg-brand-600 text-on-brand'
                    : 'border-border text-fg-muted hover:border-fg-muted hover:text-fg',
                )}
              >
                {isApplied ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
                {entry.label}
                {/* The count is what makes a refinement worth tapping: it answers
                    "how many would I get?" before the tap is spent. An applied
                    one has no count to give — it is already the result. */}
                {isApplied ? null : <span className="text-fg-muted text-xs">{entry.count}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
