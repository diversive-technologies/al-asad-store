import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import type { ProductId } from '@/lib/domain/ids';

import { loadRelatedProducts } from '../api/load-related-products';
import { ProductGrid } from './ProductGrid';

export interface RelatedProductsSectionProps {
  productId: ProductId;
  locale: Locale;
  messages: Messages;
}

/** The heading's id, shared by the section that names itself with it. */
const HEADING_ID = 'related-heading';

/**
 * §28.2 "You may also like" — the related products, drawn in the listing's own
 * grid with the catalogue's own card, so the heart, the quick add and the frames
 * all work here exactly as they do on `/catalogue` (PD-01).
 *
 * A Server Component: the heading and the grid's markup ship no JavaScript of
 * their own, and the cards are the same client leaves a listing already loads.
 *
 * NOTHING is drawn when there is nothing to suggest — no heading over an empty
 * grid and no "no suggestions" sentence. That includes a failed read, which
 * `loadRelatedProducts` has already logged.
 *
 * A11Y-09: an `h2` under the summary's `h1`, above the cards' `h3` names.
 */
export async function RelatedProductsSection({
  productId,
  locale,
  messages,
}: RelatedProductsSectionProps) {
  const entries = await loadRelatedProducts(productId, locale);
  if (entries.length === 0) return null;

  return (
    <section aria-labelledby={HEADING_ID} className="mt-16">
      <h2 id={HEADING_ID} className="text-fg mb-4 text-lg font-medium">
        {messages.product.relatedHeading}
      </h2>

      {/* PERF-07: the foot of the page — no tile here is above the fold. */}
      <ProductGrid entries={entries} locale={locale} messages={messages} priorityImageCount={0} />
    </section>
  );
}
