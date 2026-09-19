import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatMetres } from '@/lib/utils/format';

import type { ProductCard } from '../schemas/product-card.schema';

export interface ProductCardRevealProps {
  product: ProductCard;
  isRevealed: boolean;
  isSoldOut: boolean;
  locale: Locale;
  messages: Messages;
}

/**
 * The card's secondary detail — piece count and metreage — rising over the lower
 * image on intent.
 *
 * It sits OVER the image rather than below it, so showing it costs no layout
 * height and the grid never reflows on hover. §28.2's quick add is a real control
 * in `ProductCardActions`, so this no longer announces one; only the sold-out
 * state still needs saying here.
 *
 * The rise is `card-reveal` in globals.css, which also hides the panel from
 * assistive technology while it is concealed and keeps only the fade under
 * reduced motion (A11Y-10). No directive: it holds no state of its own, and the
 * card that renders it is already a Client Component.
 */
export function ProductCardReveal({
  product,
  isRevealed,
  isSoldOut,
  locale,
  messages,
}: ProductCardRevealProps) {
  const t = messages.product;

  return (
    <div
      data-revealed={isRevealed}
      className="card-reveal from-media-scrim/90 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-3 pt-10"
    >
      <dl className="text-on-media/90 flex flex-wrap gap-x-3 text-xs">
        <div>
          <dt className="sr-only">{t.pieceCountLabel}</dt>
          <dd>{product.type === 'SET' ? t.setLabel : t.singleLabel}</dd>
        </div>
        {product.metreage === null ? null : (
          <div>
            <dt className="sr-only">{t.metreageLabel}</dt>
            <dd>
              <bdi>{formatMetres(product.metreage, locale)}</bdi>
            </dd>
          </div>
        )}
      </dl>

      {!isSoldOut ? null : (
        <p className="text-on-media mt-2 text-xs font-medium">{t.soldOutBadge}</p>
      )}
    </div>
  );
}
