import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { ErrorState } from '@/components/shared/ErrorState';
import {
  fetchProduct,
  fetchProductAvailability,
  ProductScreen,
} from '@/features/catalogue';
import { getLocale, getMessages } from '@/i18n';
import { logApiError } from '@/lib/utils/log';

export interface ProductPageProps {
  // NEXT-03: params is a Promise in Next.js 16.
  params: Promise<{ slug: string }>;
}

/**
 * NEXT-11 / §30.5 — the product's own name and description, not a template.
 * A second read is cheap here: the route below asks for the same slug and
 * locale, so it is served from the same cache entry rather than refetched.
 */
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const [messages, product] = await Promise.all([getMessages(), fetchProduct(slug, locale)]);

  if (!product.ok || product.value === null) return { title: messages.product.notFoundHeading };

  return { title: product.value.name, description: product.value.description };
}

/**
 * STRUCT-02 — the route layer composes; it does not implement.
 *
 * Architecture 8.2 as two reads with different caching intents, the same shape
 * every other page in this feature uses: the product projection is cached for
 * hours, and the per-size availability overlay is not cached at all.
 */
export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  const locale = await getLocale();
  const [messages, product] = await Promise.all([getMessages(), fetchProduct(slug, locale)]);

  if (!product.ok) {
    logApiError('product', product.error); // ERR-10
    return <ErrorState className="m-gutter" message={messages.errors.network} />;
  }

  /*
   * A slug that matches nothing is an ordinary outcome, not an error — people
   * follow stale links. `notFound()` renders the 404 page rather than the
   * "we could not reach the store" one, which would be a lie.
   */
  if (product.value === null) notFound();

  const availability = await fetchProductAvailability(product.value.id);

  /*
   * §30.2: a degraded overlay costs the per-size stock marks, not the page. The
   * buy box then reports availability as unknown rather than assuming every
   * size is buyable (DATA-13a).
   */
  if (!availability.ok) logApiError('product:availability', availability.error);

  return (
    <ProductScreen
      product={product.value}
      availability={availability.ok ? availability.value : null}
      locale={locale}
      messages={messages}
    />
  );
}
