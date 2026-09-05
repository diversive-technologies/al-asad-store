import type { ProductCard } from '../schemas/product-card.schema';
import type { Suggestions } from '../schemas/search.schema';

/**
 * MOD-04 — pure, React-free. Turns section 15's `suggest(partial)` payload into
 * the flat list a combobox needs, and owns the arrow-key arithmetic.
 *
 * Flat is the point. The payload arrives as two groups — terms and products —
 * but a reader pressing Down does not care which group the next row belongs to,
 * and ARIA's `aria-activedescendant` addresses one option at a time. Keeping two
 * arrays would mean the keyboard handler had to know the grouping, and would get
 * the boundary between them wrong.
 */

/**
 * Where choosing a row takes the reader.
 *
 * A discriminated union rather than a bare string, because the two rows in this
 * list genuinely go to different places: a term runs a search, and a product
 * opens that product. Modelling both as "a term to search for" is what forced
 * the earlier compromise where picking a product searched for its NAME —
 * plausible-looking, and wrong the moment two products share a word.
 */
export type SuggestionDestination =
  | { kind: 'SEARCH'; term: string }
  | { kind: 'PRODUCT'; slug: string };

export interface SuggestionOption {
  id: string;
  label: string;
  /** Where this row goes when chosen. */
  destination: SuggestionDestination;
  /** Present for a product row, which renders a thumbnail and a price. */
  product: ProductCard | null;
}

/** Nothing is active until the reader arrows into the list. */
export const NO_ACTIVE_OPTION = -1;

export function toSuggestionOptions(suggestions: Suggestions): readonly SuggestionOption[] {
  const terms = suggestions.terms.map(
    (term): SuggestionOption => ({
      // Prefixed so a term and a product that happen to share text cannot
      // collide on `key` or on `aria-activedescendant` (CMP-10).
      id: `term:${term}`,
      label: term,
      destination: { kind: 'SEARCH', term },
      product: null,
    }),
  );

  const products = suggestions.products.map(
    (product): SuggestionOption => ({
      id: `product:${product.id}`,
      label: product.name,
      /*
       * Straight to the product. This used to run a search for the product's
       * NAME, because `/catalogue/[slug]` did not exist yet and a suggestion
       * leading to a 404 is worse than one leading to a result set containing
       * the item. M3 built that route, so the compromise is gone.
       */
      destination: { kind: 'PRODUCT', slug: product.slug },
      product,
    }),
  );

  return [...terms, ...products];
}

/**
 * Moves the active option, wrapping at both ends.
 *
 * Wrapping rather than clamping because the list is short and circular movement
 * is what the ARIA combobox pattern describes: Down from the last row returns to
 * the first, and Up from nothing active jumps to the last.
 */
export function nextActiveIndex(current: number, delta: number, length: number): number {
  if (length === 0) return NO_ACTIVE_OPTION;

  const next = current + delta;
  if (next < 0) return length - 1;
  if (next >= length) return 0;

  return next;
}
