import Link from 'next/link';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';
import { ChevronLeft, ChevronRight } from '@/lib/vendor/icons';
import { formatNumber, formatPlural } from '@/lib/utils/format';

import { setPage, toQueryString } from '../lib/search-params';
import type { CatalogueQuery } from '../schemas/search.schema';

export interface PaginationProps {
  query: CatalogueQuery;
  totalPages: number;
  basePath: string;
  locale: Locale;
  messages: Messages;
}

/** How many numbered pages to show around the current one. */
const WINDOW = 2;

function pageWindow(current: number, total: number): number[] {
  const first = Math.max(1, current - WINDOW);
  const last = Math.min(total, current + WINDOW);

  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

/**
 * Section 28.1's numbered pagination.
 *
 * Every control is a real `<a>` carrying the full query, not a button that
 * mutates state. That is what makes a page shareable, crawlable and
 * back-button-correct, and it follows from filters living in the URL
 * (STATE-01 rung 4). A11Y-01: navigation is links, not click handlers.
 *
 * I18N-05: the chevrons are directional, so they mirror with `dir`. The
 * *previous* control always points at the reading-start edge, which is left in
 * English and right in Urdu — hence `rtl:rotate-180` rather than swapping the
 * icons, which would leave the arrow correct and the tab order wrong.
 */
export function Pagination({ query, totalPages, basePath, locale, messages }: PaginationProps) {
  if (totalPages <= 1) return null;

  const t = messages.catalogue;
  const href = (page: number): string => `${basePath}${toQueryString(setPage(query, page))}`;

  const hasPrevious = query.page > 1;
  const hasNext = query.page < totalPages;

  return (
    <nav aria-label={t.paginationLabel} className="flex items-center justify-center gap-1 py-8">
      {hasPrevious ? (
        <Link
          href={href(query.page - 1)}
          aria-label={t.previousPage}
          rel="prev"
          className="rounded-card hover:bg-surface-muted p-2"
        >
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden />
        </Link>
      ) : null}

      {pageWindow(query.page, totalPages).map((page) => {
        const isCurrent = page === query.page;

        return (
          <Link
            key={page}
            href={href(page)}
            // A11Y: the current page is announced as such, not merely styled.
            aria-current={isCurrent ? 'page' : undefined}
            aria-label={formatPlural(t.goToPage, page, locale)}
            className={cn(
              'rounded-card min-w-9 px-3 py-2 text-center text-sm',
              isCurrent ? 'bg-brand-600 text-on-brand' : 'hover:bg-surface-muted text-fg',
            )}
          >
            <bdi>{formatNumber(page, locale)}</bdi>
          </Link>
        );
      })}

      {hasNext ? (
        <Link
          href={href(query.page + 1)}
          aria-label={t.nextPage}
          rel="next"
          className="rounded-card hover:bg-surface-muted p-2"
        >
          <ChevronRight className="h-5 w-5 rtl:rotate-180" aria-hidden />
        </Link>
      ) : null}
    </nav>
  );
}
