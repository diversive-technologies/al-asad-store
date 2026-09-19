import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';

import { emptyStateFor } from '../lib/listing';
import { clearFilters } from '../lib/query-changes';
import { toQueryString } from '../lib/search-params';
import type { CatalogueQuery } from '../schemas/search.schema';

export interface ListingEmptyProps {
  query: CatalogueQuery;
  basePath: string;
  messages: Messages;
}

/**
 * Section 28.1's no-results recovery: always a way back to stock.
 *
 * The words and the way out are decided by `emptyStateFor` — a search that
 * found nothing says so in search's own words, and clearing filters keeps the
 * words the customer typed on the page they typed them on.
 */
export function ListingEmpty({ query, basePath, messages }: ListingEmptyProps) {
  const state = emptyStateFor(query);
  const copy = state.wording === 'SEARCH' ? messages.search : messages.catalogue;
  const t = messages.catalogue;

  return (
    <div className="flex flex-col items-start gap-3 py-16 text-start">
      <h2 className="text-fg text-lg font-medium">{copy.noResultsHeading}</h2>
      <p className="text-fg-muted">{copy.noResultsBody}</p>

      {state.recovery === 'CLEAR_FILTERS' ? (
        <ButtonLink href={`${basePath}${toQueryString(clearFilters(query))}`} variant="secondary">
          {t.clearFilters}
        </ButtonLink>
      ) : (
        <ButtonLink href={ROUTES.catalogue.list} variant="secondary">
          {t.browseAll}
        </ButtonLink>
      )}
    </div>
  );
}
