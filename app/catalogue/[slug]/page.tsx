import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { ErrorState } from '@/components/shared/ErrorState';
import { HELP_PAGE_SLUGS, ROUTES } from '@/config/routes';
import { fetchProduct, fetchProductAvailability, ProductScreen } from '@/features/catalogue';
import { fetchHelpPage, InlineHelpPage } from '@/features/content';
import { fetchTryOnOffer, ProductTryOn } from '@/features/try-on';
import { getLocale, getMessages } from '@/i18n';
import { localeAlternates } from '@/lib/utils/locale-alternates';
import { logApiError } from '@/lib/utils/log';

export interface ProductPageProps {
  // NEXT-03: params is a Promise in Next.js 16.
  params: Promise<{ slug: string }>;
}

/** NEXT-11 / §30.5 — name, description and canonical, off the cached read the route shares. */
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const [messages, product] = await Promise.all([getMessages(), fetchProduct(slug, locale)]);

  if (!product.ok || product.value === null) return { title: messages.product.notFoundHeading };

  const { name, description } = product.value;
  const path = ROUTES.catalogue.detail(slug);
  return { title: name, description, alternates: localeAlternates(path, locale) };
}

/**
 * STRUCT-02 — the route composes; it does not implement. Architecture 8.2 as
 * reads with different caching intents: the product projection and §21's size
 * guide are cached, the per-size availability overlay is not, §24's offer briefly.
 */
export default async function ProductPage({ params }: ProductPageProps) {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);

  // PERF-02: four independent reads, never a waterfall.
  const [messages, product, offer, sizeGuide] = await Promise.all([
    getMessages(),
    fetchProduct(slug, locale),
    fetchTryOnOffer(),
    fetchHelpPage(HELP_PAGE_SLUGS.sizeGuide, locale),
  ]);

  if (!product.ok) {
    logApiError('product', product.error); // ERR-10
    return <ErrorState className="m-gutter" message={messages.errors.network} />;
  }

  // A stale link matching nothing is ordinary: the 404, not a "cannot reach store" lie.
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
      sizeGuide={<InlineHelpPage read={sizeGuide} messages={messages} />}
    />
  );
}
