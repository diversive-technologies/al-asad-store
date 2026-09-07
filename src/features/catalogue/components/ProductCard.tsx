'use client';

import { useState } from 'react';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';

import { ROUTES } from '@/config/routes';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatMetres, formatMoneyMinor } from '@/lib/utils/format';

import { deriveProductBadges, type ProductCardWithAvailability } from '../lib/product-card';
import { ProductBadge } from './ProductBadge';
import { ProductCardActions } from './ProductCardActions';
import { ProductCardFrames } from './ProductCardFrames';

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

  const [isRevealed, setIsRevealed] = useState(false);
  // A11Y-10: a reader who asked for less motion gets the panel without the slide.
  const prefersReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  return (
    <article
      className="product-card group relative flex flex-col"
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
      <div className="relative">
        {/*
         * Inside the IMAGE box, not the card.
         *
         * These are absolutely positioned, so their containing block decides
         * where they land — and while they sat directly under the `<article>`
         * the size tray's `inset-block-end: 0` resolved against the whole card
         * and the tray covered the name and price instead of the photograph.
         *
         * Still outside the `<Link>`: a `<button>` inside an `<a>` is invalid
         * HTML whose clicks navigate before their own handler runs.
         */}
        <ProductCardActions product={product} isSoldOut={isSoldOut} messages={messages} />

        <ProductCardFrames
          images={product.images}
          alt={product.name}
          isActive={isRevealed}
          isSoldOut={isSoldOut}
          messages={messages}
          hasPriorityImage={hasPriorityImage}
          sizes={sizes}
        />

        {/*
         * The link is an OVERLAY rather than a wrapper.
         *
         * A card carries real controls now — two arrows, a heart, a quick add —
         * and a `<button>` inside an `<a>` is invalid HTML whose clicks navigate
         * before their own handler runs. Covering the image with the anchor
         * instead keeps the whole tile clickable while leaving every control a
         * sibling that sits above it.
         */}
        <Link
          href={ROUTES.catalogue.detail(product.slug)}
          className="rounded-card focus-visible:ring-brand-500 absolute inset-0 z-[1] focus-visible:ring-2 focus-visible:outline-none"
        >
          <span className="sr-only">{product.name}</span>
        </Link>

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
               * §28.2's quick add is a real control now — the bag button in
               * `ProductCardActions` — so this line no longer announces one.
               * Only the sold-out state still needs saying here.
               */}
              {!isSoldOut ? null : (
                <p className="text-on-media mt-2 text-xs font-medium">{t.soldOutBadge}</p>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* The persistent strip: the two facts a grid is scanned for. */}
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
          </p>

          {product.pricing.originalMinor === null ? null : (
            <bdi className="shrink-0 line-through">
              <span className="sr-only">{t.originalPriceLabel}: </span>
              {formatMoneyMinor(product.pricing.originalMinor, locale)}
            </bdi>
          )}
        </div>
      </div>
    </article>
  );
}
