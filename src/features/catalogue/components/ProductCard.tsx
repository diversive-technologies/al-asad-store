'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';

import { ROUTES } from '@/config/routes';
import { useMediaQuery } from '@/hooks/use-media-query';
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
  /** PERF-07: only tiles above the fold should preload their image. */
  hasPriorityImage?: boolean;
  /**
   * NEXT-09: the caller states how wide this card actually renders, so a card in
   * a four-up grid does not request the same image as one in a two-up rail.
   */
  sizes?: string;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Section 28.1's card: image, hover image, work + fabric line, name, colour,
 * price, metreage and badges.
 *
 * The layout is a persistent strip plus a reveal. Name and price are always
 * visible, because those are the two facts a customer scans a grid for; the
 * secondary detail — piece count, metreage — and the quick action rise over the
 * lower image only on intent. The previous card stacked six lines of near-equal
 * weight beneath the photograph, which read as a paragraph rather than a product
 * and took half the tile from the image.
 *
 * PERF-01, stated plainly: this is now a Client Component, and every card on a
 * 24-item page carries that cost. It buys the sprung reveal below. If motion is
 * not used for anything else, the same reveal is achievable with `group-hover`
 * in pure CSS and this boundary should be reconsidered.
 */
export function ProductCard({
  entry,
  locale,
  messages,
  hasPriorityImage = false,
  sizes = '(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw',
}: ProductCardProps) {
  const { product, availability } = entry;
  const badges = deriveProductBadges(product, availability);
  const isSoldOut = availability?.status === 'SOLD_OUT';
  const t = messages.product;
  const tc = messages.catalogue;

  const [isRevealed, setIsRevealed] = useState(false);
  // A11Y-10: a reader who asked for less motion gets the panel without the slide.
  const prefersReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  return (
    <article
      className="group relative flex flex-col"
      onMouseEnter={() => {
        setIsRevealed(true);
      }}
      onMouseLeave={() => {
        setIsRevealed(false);
      }}
      // A11Y-02: keyboard users reach the reveal too, not only pointers.
      onFocus={() => {
        setIsRevealed(true);
      }}
      onBlur={() => {
        setIsRevealed(false);
      }}
    >
      <Link
        href={ROUTES.catalogue.detail(product.slug)}
        className="rounded-card focus-visible:ring-brand-500 flex flex-col focus-visible:ring-2 focus-visible:outline-none"
      >
        <div className="rounded-card bg-surface-muted relative aspect-[4/5] w-full overflow-hidden">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes={sizes}
            priority={hasPriorityImage}
            className={cn(
              'object-cover transition-opacity duration-500 motion-reduce:transition-none',
              isSoldOut ? 'opacity-60' : null,
              product.hoverImageUrl === null ? null : 'group-hover:opacity-0',
            )}
          />

          {product.hoverImageUrl === null ? null : (
            <Image
              src={product.hoverImageUrl}
              // A11Y-04: the second view is decorative; the first image names it.
              alt=""
              aria-hidden
              fill
              sizes={sizes}
              className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 motion-reduce:transition-none"
            />
          )}

          {badges.length > 0 ? (
            // I18N-04: `start-3` is logical — badges hug the reading-start corner.
            <ul className="absolute start-3 top-3 flex flex-wrap gap-1">
              {badges.map((badge) => (
                <li key={badge}>
                  <ProductBadge kind={badge} messages={messages} />
                </li>
              ))}
            </ul>
          ) : null}

          {/*
           * The reveal sits OVER the lower image rather than below it, so showing
           * it costs no layout height and the grid never reflows on hover.
           */}
          <AnimatePresence>
            {isRevealed ? (
              <motion.div
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="from-media-scrim/90 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-3 pt-10"
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

                {/*
                 * Section 28.2 offers quick add on SIMPLE and quick view on SET,
                 * chosen from the DECLARED type (DATA-13a), never by counting
                 * pieces. Quick add says plainly that it is not live yet rather
                 * than looking active and doing nothing when clicked — the bag
                 * arrives in M4.
                 */}
                <p className="text-on-media mt-2 text-xs font-medium">
                  {isSoldOut
                    ? t.soldOutBadge
                    : product.type === 'SET'
                      ? tc.quickView
                      : tc.quickAddPending}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* The persistent strip: the two facts a grid is scanned for. */}
        <div className="mt-3 flex flex-col gap-1 text-start">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-fg truncate text-sm font-medium">{product.name}</h3>
            <bdi className="text-fg shrink-0 text-sm font-medium">
              {formatMoneyMinor(product.pricing.currentMinor, locale)}
            </bdi>
          </div>

          <div className="text-fg-muted flex items-baseline justify-between gap-3 text-xs">
            {/* I18N-06: independent nouns as separate nodes, not one string. */}
            <p className="truncate">
              <span>{product.fabricName}</span>
              <span aria-hidden> · </span>
              <span>{product.colourName}</span>
            </p>

            {product.pricing.originalMinor === null ? null : (
              <bdi className="shrink-0 line-through">
                <span className="sr-only">{t.originalPriceLabel}: </span>
                {formatMoneyMinor(product.pricing.originalMinor, locale)}
              </bdi>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
