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
 * Section 28.1's "repeating asymmetric grid", as a vertical stagger.
 *
 * Every tile is the same size and the same 4:5 portrait crop; the rhythm comes
 * from alternate columns being dropped, not from some products being larger.
 *
 * That distinction matters commercially. A mosaic decides, by grid position,
 * which products get a big tile — and the customer has just told us their
 * priority by choosing a sort. Giving product three a quarter of the space of
 * product one contradicts the order they asked for. Here nothing is demoted, and
 * a filtered result can never produce a page of all-large or all-small tiles.
 *
 * It also cannot leave a hole: a short final row is simply a short row, with no
 * two-row frame to fill.
 *
 * The offsets themselves live in the `staggered-grid` utility, where the column
 * arithmetic can be expressed once per breakpoint (SSOT-01, STY-02).
 */

/** PERF-07: roughly the first two rows at the widest breakpoint. */
const ABOVE_THE_FOLD = 8;

export function ProductGrid({ entries, locale, messages }: ProductGridProps) {
  return (
    <ul className="staggered-grid pb-stagger">
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
