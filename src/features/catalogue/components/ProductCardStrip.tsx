import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatMetres, formatMoneyMinor } from '@/lib/utils/format';

import type { ProductCard } from '../schemas/product-card.schema';

export interface ProductCardStripProps {
  product: ProductCard;
  locale: Locale;
  messages: Messages;
}

/**
 * The card's persistent strip: the two facts a grid is scanned for — name and
 * price — then fabric and colour, the was-price, and whether it can be cut to
 * measure.
 *
 * §34's mark is words, not a badge: badge precedence would hide it behind "Sold
 * out", exactly when it matters. No gold: most tiles carry it.
 *
 * A length's metreage joins the fabric line on a TOUCH screen only
 * (`card-touch-only`): elsewhere the reveal carries it on hover or focus, and a
 * phone has no hover, so §28.1's metreage never reached one.
 */
export function ProductCardStrip({ product, locale, messages }: ProductCardStripProps) {
  const t = messages.product;

  return (
    <div className="mt-3 flex flex-col gap-1 text-start">
      <div className="card-line flex items-baseline justify-between gap-3">
        <h3 className="text-fg truncate text-sm font-medium">{product.name}</h3>
        <bdi className="text-fg shrink-0 text-sm font-medium">
          {formatMoneyMinor(product.pricing.currentMinor, locale)}
        </bdi>
      </div>

      <div className="card-line text-fg-muted flex items-baseline justify-between gap-3 text-xs">
        {/* I18N-06: independent nouns as separate nodes, not one string. */}
        <p className="truncate">
          <span>{product.fabricName}</span>
          <span aria-hidden> · </span>
          <span>{product.colourName}</span>
          {product.metreage === null ? null : (
            <span className="card-touch-only">
              <span aria-hidden> · </span>
              <bdi>{formatMetres(product.metreage, locale)}</bdi>
            </span>
          )}
        </p>

        {product.pricing.originalMinor === null ? null : (
          <bdi className="shrink-0 line-through">
            <span className="sr-only">{t.originalPriceLabel}: </span>
            {formatMoneyMinor(product.pricing.originalMinor, locale)}
          </bdi>
        )}
      </div>

      {product.isMadeToMeasure ? (
        <p className="text-fg-muted text-xs">{t.madeToMeasureMark}</p>
      ) : null}
    </div>
  );
}
