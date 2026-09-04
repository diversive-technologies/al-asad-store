import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import { toggleFacetValue, toQueryString } from '../lib/search-params';
import type { CatalogueQuery, FacetEntry, FacetKey } from '../schemas/search.schema';
import { FilterDisclosure } from './FilterDisclosure';
import { FilterToggleLink } from './FilterToggleLink';

export interface FacetGroupProps {
  facet: FacetKey;
  entries: readonly FacetEntry[];
  /** The values currently applied for this facet, as strings for comparison. */
  selected: readonly string[];
  query: CatalogueQuery;
  basePath: string;
  locale: Locale;
  messages: Messages;
}

/** One of section 28.1's six filter groups: a disclosure of toggle links. */
export function FacetGroup({
  facet,
  entries,
  selected,
  query,
  basePath,
  locale,
  messages,
}: FacetGroupProps) {
  // A facet with no values in the current result set is not a choice to offer.
  if (entries.length === 0) return null;

  return (
    <FilterDisclosure title={messages.catalogue.filterGroups[facet]}>
      <ul className="flex flex-col gap-0.5">
        {entries.map((entry) => (
          // CMP-10: the facet value is the stable domain key.
          <li key={entry.value}>
            <FilterToggleLink
              href={`${basePath}${toQueryString(toggleFacetValue(query, facet, entry.value))}`}
              label={entry.label}
              count={entry.count}
              isSelected={selected.includes(entry.value)}
              locale={locale}
              messages={messages}
            />
          </li>
        ))}
      </ul>
    </FilterDisclosure>
  );
}
