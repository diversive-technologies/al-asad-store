import Link from 'next/link';

import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';

import { setSort, toQueryString } from '../lib/search-params';
import { SORT_OPTIONS, type CatalogueQuery, type SortOption } from '../schemas/search.schema';

export interface SortControlProps {
  query: CatalogueQuery;
  basePath: string;
  messages: Messages;
}

/**
 * Section 28.1's four sort options.
 *
 * Links again, and for the same reasons as the facet groups — but there is a
 * second one here. A `<select>` that navigates on change is a well-known
 * keyboard trap: in several browsers arrowing through a closed select fires
 * `change` per option, so a keyboard user is navigated away before reaching the
 * option they wanted. Four links have no such failure mode.
 *
 * `aria-current` rather than an `aria-pressed` toggle: these are locations, not
 * switches, and only one is ever active.
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

  return (
    <nav aria-label={t.sort.label} className="flex flex-wrap items-center gap-1">
      <span className="text-fg-muted me-1 text-sm">{t.sort.label}</span>

      {options.map((option) => {
        const isCurrent = option === query.sort;

        return (
          <Link
            key={option}
            href={`${basePath}${toQueryString(setSort(query, option))}`}
            aria-current={isCurrent ? 'true' : undefined}
            className={cn(
              'rounded-pill focus-visible:ring-brand-500 px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none',
              isCurrent
                ? 'bg-brand-600 text-on-brand'
                : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
            )}
          >
            {t.sort[option]}
          </Link>
        );
      })}
    </nav>
  );
}
