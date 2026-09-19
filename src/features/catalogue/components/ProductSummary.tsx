import type { ReactNode } from 'react';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatDate, formatNumber, formatTemplate } from '@/lib/utils/format';

import type { ProductDetailAvailability } from '../schemas/piece-availability.schema';
import type { ProductDetail } from '../schemas/product-detail.schema';
import { ProductBuyBox } from './ProductBuyBox';
import { ProductShare } from './ProductShare';
import { StitchingFork } from './StitchingFork';

export interface ProductSummaryProps {
  product: ProductDetail;
  availability: ProductDetailAvailability | null;
  locale: Locale;
  messages: Messages;
  /** §24's try-on entry — a slot the route fills, see `ProductScreen`. */
  tryOn: ReactNode;
  /** §28.2's size guide — a slot the route fills, see `ProductScreen`. */
  sizeGuide: ReactNode;
}

/**
 * The column beside the gallery: what the product is, the buy box, the ways to
 * have it made or tried on, when it arrives, and the ways to send it to someone.
 *
 * §34's fork is drawn only when the BACKEND offers stitching for this product,
 * the same way the Fabric Calculator is, so nothing here decides which garments
 * the workshop will cut (DATA-13).
 */
export function ProductSummary({
  product,
  availability,
  locale,
  messages,
  tryOn,
  sizeGuide,
}: ProductSummaryProps) {
  const t = messages.product;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-fg text-2xl font-semibold">{product.name}</h1>
        <p className="text-fg-muted">{product.description}</p>
        <p className="text-fg-muted text-xs">
          {t.codeLabel}: <bdi>{product.code}</bdi>
        </p>
      </div>

      <ProductBuyBox
        product={product}
        availability={availability}
        locale={locale}
        messages={messages}
        sizeGuide={sizeGuide}
      />

      {product.stitching === null ? null : (
        <StitchingFork
          offer={product.stitching}
          slug={product.slug}
          locale={locale}
          messages={messages}
        />
      )}

      {tryOn}

      <dl className="border-border text-fg-muted flex flex-col gap-2 border-t pt-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <dt className="text-fg font-medium">{t.estimatedDelivery}</dt>
          {/* I18N-08 / DATA-12: an ISO date from the backend, formatted here. */}
          <dd>
            <bdi>{formatDate(product.estimatedDeliveryDate, locale)}</bdi>
          </dd>
        </div>

        {product.model === null ? null : (
          <div>
            <dt className="sr-only">{t.selectSizeHeading}</dt>
            {/* I18N-06: one parameterised sentence, never concatenated parts. */}
            <dd>
              {formatTemplate(t.modelNote, {
                height: formatNumber(product.model.heightCm, locale),
                size: product.model.sizeWorn,
              })}
            </dd>
          </div>
        )}
      </dl>

      <ProductShare slug={product.slug} productName={product.name} messages={messages} />
    </div>
  );
}
