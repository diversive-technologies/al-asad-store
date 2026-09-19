import Link from 'next/link';

import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';
import { Check } from '@/lib/vendor/icons';

import { setSort } from '../lib/query-changes';
import { toQueryString } from '../lib/search-params';
import type { CatalogueQuery, SortOption } from '../schemas/search.schema';

export interface SortMenuProps {
  /** The popover's id, which the trigger's `popoverTarget` names. */
  id: string;
  query: CatalogueQuery;
  basePath: string;
  options: readonly SortOption[];
  current: SortOption | undefined;
  messages: Messages;
}

/**
 * The sort popover: one link per order.
 *
 * KEYED on the canonical query, so ANY navigation from inside it gives React a
 * different key, unmounts this element and mounts a fresh one — which closes the
 * popover. It needs closing because Next navigates on the client: the DOM
 * element survives, and with it the open state, so choosing a sort left the menu
 * hanging over the re-ordered grid. Removing the element is also how the
 * platform itself closes a popover. Re-picking the option already current is the
 * one case this does not cover — same URL, same key — and there the trigger and
 * light-dismiss still close it.
 *
 * A11Y-01: a list of destinations is a nav, carrying the name the trigger showed.
 * `aria-current` rather than `aria-pressed`: these are locations, not switches.
 * A11Y-06: the tick is not the only signal — `aria-current` carries it, and the
 * weight change carries it visually.
 */
export function SortMenu({ id, query, basePath, options, current, messages }: SortMenuProps) {
  const t = messages.catalogue;

  return (
    <div key={toQueryString(query)} id={id} popover="auto" className="sort-panel popover-animated">
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
                  {isCurrent ? <Check className="text-brand-600 h-4 w-4" aria-hidden /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
