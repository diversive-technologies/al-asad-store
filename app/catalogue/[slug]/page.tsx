import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { ErrorState } from '@/components/shared/ErrorState';
import { fetchProduct, fetchProductAvailability, ProductScreen } from '@/features/catalogue';
import { fetchTryOnOffer, ProductTryOn } from '@/features/try-on';
import { getLocale, getMessages } from '@/i18n';
import { logApiError } from '@/lib/utils/log';

export interface ProductPageProps {
  // NEXT-03: params is a Promise in Next.js 16.
  params: Promise<{ slug: string }>;
}

/**
 * NEXT-11 / §30.5 — the product's own name and description, not a template. The
 * second read hits the cache entry the route below fills, so it is cheap.
 */
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const [messages, product] = await Promise.all([getMessages(), fetchProduct(slug, locale)]);

  if (!product.ok || product.value === null) return { title: messages.product.notFoundHeading };

  return { title: product.value.name, description: product.value.description };
}

/**
 * STRUCT-02 — the route composes; it does not implement. Architecture 8.2 as
 * reads with different caching intents: the product projection caches for hours,
 * the per-size availability overlay not at all, §24's try-on offer for a minute.
 */
export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  const locale = await getLocale();

  // PERF-02: three independent reads, never a waterfall.
  const [messages, product, offer] = await Promise.all([
    getMessages(),
    fetchProduct(slug, locale),
    fetchTryOnOffer(),
  ]);

  if (!product.ok) {
    logApiError('product', product.error); // ERR-10
    return <ErrorState className="m-gutter" message={messages.errors.network} />;
  }

  // A slug matching nothing is ordinary, not an error — people follow stale
  // links. `notFound()` renders the 404 rather than a "cannot reach store" lie.
  if (product.value === null) notFound();

  const availability = await fetchProductAvailability(product.value.id);

  // §30.2: a degraded overlay costs the per-size stock marks, not the page — the
  // buy box reports availability as unknown rather than assuming (DATA-13a).
  if (!availability.ok) logApiError('product:availability', availability.error);

  return (
    <ProductScreen
      product={product.value}
      availability={availability.ok ? availability.value : null}
      locale={locale}
      messages={messages}
      tryOn={
        <ProductTryOn
          offer={offer}
          productId={product.value.id}
          productName={product.value.name}
          locale={locale}
          messages={messages}
        />
      }
    />
  );
}
