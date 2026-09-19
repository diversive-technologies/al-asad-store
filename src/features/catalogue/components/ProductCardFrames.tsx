'use client';

import type { ReactNode } from 'react';

import Image from 'next/image';

import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';

import { useFrameCarousel } from '../hooks/use-frame-carousel';
import { useSwipeStep } from '../hooks/use-swipe-step';
import type { ProductCard } from '../schemas/product-card.schema';
import { ProductCardFrameControls } from './ProductCardFrameControls';

export interface ProductCardFramesProps {
  /** The product whose photographs these are; its name is the first frame's alt. */
  product: ProductCard;
  /** True while the pointer is over the card, or focus is inside it. */
  isActive: boolean;
  isSoldOut: boolean;
  messages: Messages;
  hasPriorityImage: boolean;
  sizes: string;
  /** The card's link overlay. See the note in `ProductCard` for why it lives here. */
  children?: ReactNode;
}

/**
 * The card's photography: a stack of frames, advanced by hover and by two
 * explicit controls.
 *
 * Both ways in matter, and for different people. The hover advance is what
 * makes a grid feel alive when a customer sweeps across it; the arrows are what
 * a keyboard user, a touch user and anyone who wants to go BACK actually needs,
 * because a hover that only ever moves forwards cannot be steered.
 *
 * Every frame is rendered and cross-faded rather than swapping one `src`, so
 * moving between them never shows the empty box of an image still loading.
 *
 * The sold-out dimming belongs on the frames' WRAPPER, not on each frame. `cn`
 * resolves conflicting Tailwind classes by keeping the last one, so `opacity-60`
 * on the images overrode the `opacity-0` that hides the inactive ones — every
 * frame rendered at 60% simultaneously, ghosted over each other. The controls
 * stay outside that wrapper: a sold-out product can still be looked at, so its
 * arrows must not be dimmed along with its photography.
 */
export function ProductCardFrames({
  product,
  isActive,
  isSoldOut,
  messages,
  hasPriorityImage,
  sizes,
  children,
}: ProductCardFramesProps) {
  const { images } = product;
  const hasMultiple = images.length > 1;
  const carousel = useFrameCarousel(images.length, isActive);
  const swipe = useSwipeStep(hasMultiple, carousel.step);

  return (
    <div
      className="rounded-card bg-surface-muted relative aspect-[4/5] w-full overflow-hidden"
      {...swipe}
    >
      <div className={cn('absolute inset-0', isSoldOut ? 'opacity-60' : null)}>
        {images.map((url, position) => (
          <Image
            key={url}
            src={url}
            /*
             * A11Y-04: the first frame names the product. The rest are further
             * views of a thing the card already names, so an empty alt is correct
             * rather than lazy — repeating the name five times is noise.
             */
            alt={position === 0 ? product.name : ''}
            aria-hidden={position !== 0}
            fill
            sizes={sizes}
            /* PERF-07: a leading tile's first frame loads at once. Not `fetchPriority`:
               several tiles share the first row, and only one image can be first. */
            loading={position === 0 && hasPriorityImage ? 'eager' : 'lazy'}
            className={cn(
              'object-cover transition-opacity duration-500 motion-reduce:transition-none',
              position === carousel.index ? 'opacity-100' : 'opacity-0',
            )}
          />
        ))}
      </div>

      {children}

      {!hasMultiple ? null : (
        <ProductCardFrameControls
          images={images}
          index={carousel.index}
          onStep={carousel.step}
          messages={messages}
        />
      )}
    </div>
  );
}
