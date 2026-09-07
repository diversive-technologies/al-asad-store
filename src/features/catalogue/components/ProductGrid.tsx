import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import type { ProductCardWithAvailability } from '../lib/product-card';
import { ProductCard } from './ProductCard';

export interface ProductGridProps {
  entries: readonly ProductCardWithAvailability[];
  locale: Locale;
  messages: Messages;
}

/**
 * Section 28.1's listing grid. Every tile is the same size and the same 4:5
 * portrait crop, in uniform rows.
 *
 * §28.1 asks for a "repeating asymmetric grid" and this is deliberately not
 * one: the operator asked for the simple layout instead, and the stagger it
 * replaced had a cost beyond taste. A dropped alternate column makes the row
 * boundary ambiguous, so a part-filled last row reads as a broken layout rather
 * than as the end of a page — and that is exactly the state the page size is
 * now chosen to avoid.
 *
 * Nothing here decides tile size by grid position, which is the property worth
 * keeping from the asymmetric version: the customer has just told us their
 * priority by choosing a sort, and giving product three a quarter of the space
 * of product one would contradict the order they asked for.
 *
 * The column counts live in the `product-grid` utility, where they can be
 * expressed once per breakpoint (SSOT-01, STY-02).
 */

/** PERF-07: roughly the first two rows at the widest breakpoint. */
const ABOVE_THE_FOLD = 8;

export function ProductGrid({ entries, locale, messages }: ProductGridProps) {
  return (
    <ul className="product-grid">
      {entries.map((entry, index) => (
        // CMP-10: a stable, domain-derived key.
        <li key={entry.product.id}>
          <ProductCard
            entry={entry}
            locale={locale}
            messages={messages}
            hasPriorityImage={index < ABOVE_THE_FOLD}
          />
        </li>
      ))}
    </ul>
  );
}
