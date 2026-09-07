import Link from 'next/link';

import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';
import { Check, ChevronDown } from '@/lib/vendor/icons';

import { setSort, toQueryString } from '../lib/search-params';
import { SORT_OPTIONS, type CatalogueQuery, type SortOption } from '../schemas/search.schema';

export interface SortControlProps {
  query: CatalogueQuery;
  basePath: string;
  messages: Messages;
}

/**
 * The id the trigger and the panel agree on.
 *
 * CMP-11 asks for generated ids, and `useId` would mean making this a Client
 * Component — which is the one thing this control is built to avoid. A constant
 * is safe here because exactly one sort control exists per page: `/catalogue`
 * and `/search` each render `CatalogueScreen` once. If a second is ever needed
 * on one page, that is the moment this becomes a prop.
 */
const MENU_ID = 'catalogue-sort-menu';

/**
 * Section 28.1's four sort options, as a dropdown.
 *
 * They used to sit open as a row of pills, which spent a whole line of the
 * toolbar on three choices nobody had made — and wrapped onto a second line on
 * a phone. Collapsed, the toolbar says what the order IS and offers to change
 * it, which is the more useful sentence.
 *
 * **It is still a Server Component and still ships no JavaScript.** The panel is
 * a native `popover` and the trigger reaches it through `popoverTarget`, so the
 * top layer, light-dismiss, `Escape` and focus return all come from the platform
 * and all work before hydration (BASE-01, A11Y-08). Nothing here needs `useState`.
 *
 * The options are `<a>` elements, which matters twice over. Every sort stays a
 * crawlable URL, and a `<select>` that navigates on change is avoided — in
 * several browsers arrowing through a closed select fires `change` per option,
 * so a keyboard user is navigated away before reaching the option they wanted.
 *
 * `aria-current` rather than `aria-pressed`: these are locations, not switches,
 * and only one is ever active.
 */
export function SortControl({ query, basePath, messages }: SortControlProps) {
  const t = messages.catalogue;

  /*
   * Relevance against an empty term is not an ordering, which is why
   * `parseCatalogueQuery` demotes it. Offering it here would advertise a sort
   * that silently becomes a different one — so the option is withheld rather
   * than shown and overridden.
   */
  const options: readonly SortOption[] =
    query.term.length > 0 ? SORT_OPTIONS : SORT_OPTIONS.filter((option) => option !== 'RELEVANCE');

  // The label on the trigger. `query.sort` is already demoted by the parser, so
  // it cannot name an option this list does not offer.
  const current = options.includes(query.sort) ? query.sort : options[0];

  return (
    <>
      <button
        type="button"
        popoverTarget={MENU_ID}
        /*
         * A11Y-04 — the full name, always. The "Sort by" prefix is hidden on a
         * phone to keep the toolbar on one line, and `display: none` takes it
         * out of the accessibility tree with it, so the name is stated here
         * rather than left to depend on the viewport.
         */
        aria-label={`${t.sort.label}: ${current === undefined ? '' : t.sort[current]}`}
        className="sort-trigger"
      >
        {/* Below 40rem the toolbar has to hold Filters, the layout switcher and
            this; at 375px the prefix is the ~55px that made it wrap. */}
        <span className="text-fg-muted hidden sm:inline">{t.sort.label}</span>
        <span className="text-fg font-medium">{current === undefined ? '' : t.sort[current]}</span>
        {/* I18N-05: a chevron pointing DOWN is not directional and must not mirror. */}
        <ChevronDown className="text-fg-muted h-4 w-4" aria-hidden />
      </button>

      {/*
       * Keyed on the canonical query, so ANY navigation from inside the panel
       * gives React a different key, unmounts this element and mounts a fresh
       * one — which closes the popover.
       *
       * It needs closing because Next navigates on the client: the DOM element
       * survives, and with it the open state, so choosing a sort left the menu
       * hanging over the re-ordered grid. Removing the element is also how the
       * platform itself closes a popover, so nothing has to be told to.
       *
       * This is what keeps the control free of `useState` and of JavaScript
       * altogether. Re-picking the option that is already current is the one
       * case it does not cover — same URL, same key — and there the trigger and
       * light-dismiss still close it.
       */}
      <div
        key={toQueryString(query)}
        id={MENU_ID}
        popover="auto"
        className="sort-panel popover-animated"
      >
        {/* A11Y-01: a list of destinations is a nav, and it carries the name the
            trigger showed, so the panel is identifiable on its own. */}
        <nav aria-label={t.sort.label}>
          <ul>
            {options.map((option) => {
              const isCurrent = option === current;

              return (
                <li key={option}>
                  <Link
                    href={`${basePath}${toQueryString(setSort(query, option))}`}
                    aria-current={isCurrent ? 'true' : undefined}
                    className={cn('sort-option', isCurrent ? 'text-fg font-medium' : 'text-fg')}
                  >
                    {t.sort[option]}
                    {/* A11Y-06: the tick is not the only signal — `aria-current`
                        carries it, and the weight change carries it visually. */}
                    {isCurrent ? <Check className="text-brand-600 h-4 w-4" aria-hidden /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
