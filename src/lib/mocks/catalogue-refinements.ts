import { CATALOGUE, type CatalogueRecord } from './catalogue-db';
import { countBy, matches, type Criterion, type SearchContext } from './catalogue-query';

/** One way to narrow a search, as the suggest payload carries it. */
export interface RefinementPayload {
  key: string;
  value: string;
  label: string;
  count: number;
}

/** How many ways to narrow are offered at once. */
const MAX_REFINEMENTS = 6;

/**
 * The ways this search could be narrowed, ranked.
 *
 * Each facet is counted with every OTHER filter applied but NOT its own — the
 * same contextual rule §15 states for the listing, and for the same reason. It
 * is what lets someone who has already chosen Boski still see the other
 * fabrics: count fabric with the fabric filter applied and Boski would be the
 * only one left, so the control that got them there could never take them back.
 *
 * Two kinds of value are withheld, and they are separate rules — collapsing
 * them into one was a bug worth recording. A value shared by EVERY record in
 * its own facet's scope narrows nothing, so it is dropped. A value already
 * SELECTED is not a way to narrow at all; it is the current state, and the
 * panel lists it separately so it can be undone.
 *
 * Comparing a facet-scoped count against the fully filtered total instead —
 * which is what the first version did — wipes out the whole facet the moment
 * one of its values is chosen: with boski picked, every other fabric also
 * counts four, so all four looked like they "narrowed nothing" and the reader
 * lost every route back.
 *
 * Counted over everything that matched, never over the four products the panel
 * happens to show — that is the whole reason this is computed here rather than
 * in the interface. "Boski (7)" is only true if seven of the matches are boski,
 * and the panel cannot know that.
 *
 * Ranked by count and flattened across facets rather than grouped under
 * headings, because the panel has one narrow column: three headings and their
 * values would spend most of it on labels.
 */
export function buildRefinements(context: SearchContext): RefinementPayload[] {
  const { query } = context;
  if (CATALOGUE.filter((record) => matches(record, context)).length < 2) return [];

  const forFacet = (ignore: Criterion) => CATALOGUE.filter((r) => matches(r, context, ignore));

  const isSelected = (key: string, value: string): boolean => {
    if (key === 'pieceCount') return query.pieceCount.includes(Number(value));
    if (key === 'fabric') return query.fabric.includes(value);
    if (key === 'colour') return query.colour.includes(value);
    return query.garmentType.includes(value);
  };

  const groups = [
    { key: 'fabric', scope: forFacet('fabric'), pick: (r: CatalogueRecord) => r.fabric },
    { key: 'colour', scope: forFacet('colour'), pick: (r: CatalogueRecord) => r.colour },
    {
      key: 'garmentType',
      scope: forFacet('garmentType'),
      pick: (r: CatalogueRecord) => r.garmentType,
    },
    {
      key: 'pieceCount',
      scope: forFacet('pieceCount'),
      pick: (r: CatalogueRecord) => String(r.pieceCount),
    },
  ];

  return groups
    .flatMap(({ key, scope, pick }) =>
      countBy(scope, query.locale, pick)
        // Shared by everything in this facet's own scope: narrows nothing.
        .filter((entry) => entry.count !== scope.length)
        .map((entry) => ({ key, ...entry })),
    )
    .filter((entry) => !isSelected(entry.key, entry.value))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, MAX_REFINEMENTS);
}
