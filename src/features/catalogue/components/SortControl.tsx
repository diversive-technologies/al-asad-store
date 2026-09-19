import type { Messages } from '@/i18n/messages/en';
import { formatTemplate } from '@/lib/utils/format';
import { ChevronDown } from '@/lib/vendor/icons';

import { SORT_OPTIONS, type CatalogueQuery, type SortOption } from '../schemas/search.schema';
import { SortMenu } from './SortMenu';

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
 * Relevance against an empty term is not an ordering, which is why
 * `parseCatalogueQuery` demotes it; offering it here would advertise a sort that
 * silently becomes a different one, so the option is withheld. `query.sort` is
 * already demoted by the parser, so the trigger cannot name an option the list
 * does not offer.
 *
 * A11Y-04 — the trigger states its full name, always. The "Sort by" prefix is
 * hidden below 40rem to keep the toolbar on one line (at 375px it was the ~55px
 * that made it wrap), and `display: none` takes it out of the accessibility tree
 * with it. I18N-05: a chevron pointing DOWN is not directional and must not mirror.
 */
export function SortControl({ query, basePath, messages }: SortControlProps) {
  const t = messages.catalogue;
  const options: readonly SortOption[] =
    query.term.length > 0 ? SORT_OPTIONS : SORT_OPTIONS.filter((option) => option !== 'RELEVANCE');
  const current = options.includes(query.sort) ? query.sort : options[0];
  const currentLabel = current === undefined ? '' : t.sort[current];

  return (
    <>
      <button
        type="button"
        popoverTarget={MENU_ID}
        aria-label={formatTemplate(t.sort.trigger, { label: t.sort.label, value: currentLabel })}
        className="sort-trigger"
      >
        <span className="text-fg-muted hidden sm:inline">{t.sort.label}</span>
        <span className="text-fg font-medium">{currentLabel}</span>
        <ChevronDown className="text-fg-muted h-4 w-4" aria-hidden />
      </button>

      <SortMenu
        id={MENU_ID}
        query={query}
        basePath={basePath}
        options={options}
        current={current}
        messages={messages}
      />
    </>
  );
}
