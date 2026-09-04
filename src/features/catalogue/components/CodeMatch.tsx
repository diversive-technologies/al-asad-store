import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import type { ProductCardWithAvailability } from '../lib/product-card';
import { ProductCard } from './ProductCard';

export interface CodeMatchProps {
  entry: ProductCardWithAvailability;
  locale: Locale;
  messages: Messages;
}

/**
 * Section 28.1's code lookup: the one product whose code the customer typed.
 *
 * It sits above the results rather than inside them because it is a shortcut,
 * not a result — someone who types a code from a WhatsApp message or a printed
 * catalogue has already chosen, and making them find their own product in a grid
 * would waste the exactness they gave us.
 *
 * It appears alongside the ordinary results rather than replacing them: the
 * backend matches codes in general search too, so the grid below is still a
 * useful "and here is everything else that matched".
 *
 * The tile is deliberately narrow. A full-width card for a single product reads
 * as a hero and competes with the results; this is a pointer, not a banner.
 */
export function CodeMatch({ entry, locale, messages }: CodeMatchProps) {
  return (
    <section aria-labelledby="code-match-heading" className="page-shell pt-8">
      {/* A11Y-09: sits under the page's h1, above the results. */}
      <h2 id="code-match-heading" className="text-fg-muted mb-3 text-sm font-medium">
        {messages.search.exactMatchHeading}
      </h2>

      <div className="max-w-64">
        <ProductCard
          entry={entry}
          locale={locale}
          messages={messages}
          // PERF-07: above the fold on this page, unlike the grid below it.
          hasPriorityImage
          sizes="16rem"
        />
      </div>
    </section>
  );
}
