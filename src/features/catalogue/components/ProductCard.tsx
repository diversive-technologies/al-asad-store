import Image from 'next/image';
import Link from 'next/link';

import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';
import { formatMetres, formatMoneyMinor } from '@/lib/utils/format';

import { deriveProductBadges, type ProductCardWithAvailability } from '../lib/product-card';
import { ProductBadge } from './ProductBadge';

export interface ProductCardProps {
  entry: ProductCardWithAvailability;
  locale: Locale;
  messages: Messages;
  /** PERF-07: only the first row above the fold should preload its image. */
  hasPriorityImage?: boolean;
  /**
   * NEXT-09: the asymmetric grid gives tiles different widths, so the caller
   * states how wide this card actually renders. A single hard-coded value would
   * make a double-width tile request an undersized image and show it soft.
   */
  sizes?: string;
}

/**
 * Section 28.1's card: image, hover image, work + fabric line, name, colour,
 * price, metreage and badges.
 *
 * A Server Component by design — the hover image swap is CSS, so this whole
 * component costs nothing in the client bundle (PERF-01).
 */
export function ProductCard({
  entry,
  locale,
  messages,
  hasPriorityImage = false,
  sizes = '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 60vw',
}: ProductCardProps) {
  const { product, availability } = entry;
  const badges = deriveProductBadges(product, availability);
  const isSoldOut = availability?.status === 'SOLD_OUT';
  const t = messages.product;

  return (
    <article className="group relative flex flex-col gap-2">
      <Link
        href={ROUTES.catalogue.detail(product.slug)}
        className="rounded-card flex flex-col gap-2 focus-visible:outline-none"
      >
        <div className="rounded-card bg-surface-muted relative aspect-[4/5] w-full overflow-hidden">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes={sizes}
            priority={hasPriorityImage}
            className={cn(
              'object-cover transition-opacity duration-300 motion-reduce:transition-none',
              isSoldOut ? 'opacity-60' : null,
              product.hoverImageUrl === null ? null : 'group-hover:opacity-0',
            )}
          />

          {product.hoverImageUrl === null ? null : (
            <Image
              src={product.hoverImageUrl}
              // A11Y-04: the second view is decorative; the first image names the product.
              alt=""
              aria-hidden
              fill
              sizes={sizes}
              className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none"
            />
          )}

          {badges.length > 0 ? (
            // I18N-04: `start-2` is logical — badges sit at the reading-start
            // corner in both directions.
            <ul className="absolute start-2 top-2 flex flex-wrap gap-1">
              {badges.map((badge) => (
                <li key={badge}>
                  <ProductBadge kind={badge} messages={messages} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-col gap-1 text-start">
          {/* I18N-06: two independent nouns rendered as separate nodes rather
              than concatenated into one translatable string. */}
          <p className="text-fg-muted text-xs tracking-wide uppercase">
            <span>{product.workType}</span>
            <span aria-hidden> · </span>
            <span>{product.fabricName}</span>
          </p>

          <h3 className="text-fg text-sm font-medium">{product.name}</h3>

          <p className="text-fg-muted text-xs">
            <span className="sr-only">{t.colourLabel}: </span>
            {product.colourName}
            {product.type === 'SET' ? (
              // DATA-13a: read from the declared type, never from pieces.length.
              <span> · {t.setLabel}</span>
            ) : null}
          </p>

          {product.metreage === null ? null : (
            <p className="text-fg-muted text-xs">
              <span className="sr-only">{t.metreageLabel}: </span>
              <bdi>{formatMetres(product.metreage, locale)}</bdi>
            </p>
          )}

          <p className="flex items-baseline gap-2 text-sm">
            <bdi className="text-fg font-medium">
              {formatMoneyMinor(product.pricing.currentMinor, locale)}
            </bdi>
            {product.pricing.originalMinor === null ? null : (
              <bdi className="text-fg-muted text-xs line-through">
                <span className="sr-only">{t.originalPriceLabel}: </span>
                {formatMoneyMinor(product.pricing.originalMinor, locale)}
              </bdi>
            )}
          </p>
        </div>
      </Link>
    </article>
  );
}
