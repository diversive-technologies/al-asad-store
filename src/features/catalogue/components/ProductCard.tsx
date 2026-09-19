'use client';

import { useState } from 'react';

import Link from 'next/link';

import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import { deriveProductBadges, type ProductCardWithAvailability } from '../lib/product-card';
import type { ProductCard as ProductCardPayload } from '../schemas/product-card.schema';
import { ProductCardActions } from './ProductCardActions';
import { ProductCardBadges } from './ProductCardBadges';
import { ProductCardFrames } from './ProductCardFrames';
import { ProductCardReveal } from './ProductCardReveal';
import { ProductCardStrip } from './ProductCardStrip';

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
  /**
   * What the page does once the quick add has put this product in the bag. Absent,
   * the bag panel opens; the saved-items page passes one, because an add there
   * MOVES the product off its list.
   */
  onAddedToBag?: ((product: ProductCardPayload) => void) | undefined;
}

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
 * The actions sit inside the IMAGE box, not the card: they are absolutely
 * positioned, so their containing block decides where they land, and while they
 * sat directly under the `<article>` the size tray covered the name and price
 * instead of the photograph. They stay outside the `<Link>`, because a `<button>`
 * inside an `<a>` is invalid HTML whose clicks navigate before their own handler
 * runs.
 *
 * The link is therefore an OVERLAY rather than a wrapper, and it is passed INTO
 * the frames rather than rendered beside them: the frames listen for a swipe,
 * and a touch that lands on the anchor only bubbles to the anchor's own
 * ancestors. As a sibling the overlay swallowed every gesture before the
 * carousel could see it; as a child, the gesture reaches it.
 *
 * PERF-01, stated plainly: this is a Client Component, and every card on a
 * 24-item page carries that cost. It buys the reveal on intent, the frame
 * carousel, the heart and the quick add; the reveal's motion itself is CSS.
 */
export function ProductCard({
  entry,
  locale,
  messages,
  hasPriorityImage = false,
  sizes = '(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw',
  onAddedToBag,
}: ProductCardProps) {
  const { product, availability } = entry;
  const badges = deriveProductBadges(product, availability);
  const isSoldOut = availability?.status === 'SOLD_OUT';
  const [isRevealed, setIsRevealed] = useState(false);
  const reveal = (): void => setIsRevealed(true);
  const conceal = (): void => setIsRevealed(false);

  return (
    // A11Y-02: keyboard users reach the reveal too, not only pointers.
    <article
      className="product-card group relative flex flex-col"
      onMouseEnter={reveal}
      onMouseLeave={conceal}
      onFocus={reveal}
      onBlur={conceal}
    >
      <div className="relative">
        <ProductCardActions
          product={product}
          isSoldOut={isSoldOut}
          locale={locale}
          messages={messages}
          onAddedToBag={onAddedToBag}
        />
        <ProductCardFrames
          product={product}
          isActive={isRevealed}
          isSoldOut={isSoldOut}
          messages={messages}
          hasPriorityImage={hasPriorityImage}
          sizes={sizes}
        >
          <Link
            href={ROUTES.catalogue.detail(product.slug)}
            className="rounded-card focus-visible:ring-brand-500 absolute inset-0 z-[1] focus-visible:ring-2 focus-visible:outline-none"
          >
            <span className="sr-only">{product.name}</span>
          </Link>
        </ProductCardFrames>
        <ProductCardBadges badges={badges} messages={messages} />
        <ProductCardReveal
          product={product}
          isRevealed={isRevealed}
          isSoldOut={isSoldOut}
          locale={locale}
          messages={messages}
        />
      </div>

      <ProductCardStrip product={product} locale={locale} messages={messages} />
    </article>
  );
}
