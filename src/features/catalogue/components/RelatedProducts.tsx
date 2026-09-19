import { Suspense } from 'react';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import type { ProductId } from '@/lib/domain/ids';

import { RelatedProductsSection } from './RelatedProductsSection';
import { RelatedProductsSkeleton } from './RelatedProductsSkeleton';

export interface RelatedProductsProps {
  productId: ProductId;
  locale: Locale;
  messages: Messages;
}

/**
 * §28.2 "You may also like", STREAMED behind its own boundary (NEXT-13).
 *
 * It is the slowest thing on the product page that nobody needs in order to buy:
 * two reads — the related products, then their live availability — started only
 * once the product itself is in hand. Inside a `<Suspense>`, the gallery, the buy
 * box and Add to bag render and work while it is still on its way, and whatever
 * happens to it — an empty answer, a failed read — never reaches them (§30.2).
 */
export function RelatedProducts({ productId, locale, messages }: RelatedProductsProps) {
  return (
    <Suspense fallback={<RelatedProductsSkeleton />}>
      <RelatedProductsSection productId={productId} locale={locale} messages={messages} />
    </Suspense>
  );
}
