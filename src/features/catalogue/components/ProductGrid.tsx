import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';

import type { ProductCardWithAvailability } from '../lib/product-card';
import { ProductCard } from './ProductCard';

export interface ProductGridProps {
  entries: readonly ProductCardWithAvailability[];
  locale: Locale;
  messages: Messages;
}

/**
 * Section 28.1's "repeating asymmetric grid".
 *
 * The rhythm repeats every six tiles: the first of each block spans two columns
 * from the large breakpoint up. That gives the page editorial variety without
 * the card knowing anything about it — a card is the same component whatever
 * width it lands in, which is why the grid could be added after the card was
 * already built and used on the homepage.
 *
 * The pattern is index-based rather than data-driven on purpose. Tying tile size
 * to a product attribute would mean a filtered result set could produce a page
 * of all-wide or all-narrow tiles, and the layout would collapse on exactly the
 * views a customer reaches by filtering.
 *
 * RTL needs nothing here: CSS Grid places tiles along the inline axis, so the
 * whole arrangement mirrors from `dir` alone (I18N-04).
 */
const BLOCK_SIZE = 6;

/** Matching `sizes` per tile, so a wide tile does not request a narrow image. */
const WIDE_SIZES = '(min-width: 1024px) 50vw, (min-width: 640px) 66vw, 100vw';
const NARROW_SIZES = '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw';

/** The first row is above the fold; PERF-07 preloads only those images. */
const ABOVE_THE_FOLD = 4;

export function ProductGrid({ entries, locale, messages }: ProductGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {entries.map((entry, index) => {
        const isWide = index % BLOCK_SIZE === 0;

        return (
          // CMP-10: a stable, domain-derived key.
          <li key={entry.product.id} className={cn(isWide ? 'lg:col-span-2' : null)}>
            <ProductCard
              entry={entry}
              locale={locale}
              messages={messages}
              hasPriorityImage={index < ABOVE_THE_FOLD}
              sizes={isWide ? WIDE_SIZES : NARROW_SIZES}
            />
          </li>
        );
      })}
    </ul>
  );
}
