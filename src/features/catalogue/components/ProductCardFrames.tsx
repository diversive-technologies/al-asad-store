'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';

import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';
import { ChevronLeft, ChevronRight } from '@/lib/vendor/icons';

export interface ProductCardFramesProps {
  images: readonly string[];
  alt: string;
  /** True while the pointer is over the card, or focus is inside it. */
  isActive: boolean;
  isSoldOut: boolean;
  messages: Messages;
  hasPriorityImage: boolean;
  sizes: string;
}

/**
 * How long each frame holds before the hover advances to the next one.
 *
 * 2.5s, not 1.1s. With five frames the faster cadence cycled a whole garment in
 * under six seconds, which read as a flicker rather than a look — the eye never
 * settled on one image long enough to take it in.
 */
const ADVANCE_MS = 2500;

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
 */
export function ProductCardFrames({
  images,
  alt,
  isActive,
  isSoldOut,
  messages,
  hasPriorityImage,
  sizes,
}: ProductCardFramesProps) {
  const t = messages.catalogue;
  const [index, setIndex] = useState(0);
  /*
   * Set the moment an arrow is used, and it stops the automatic advance for the
   * rest of this hover. Someone who steers to a frame is looking at THAT frame;
   * sliding it out from under them a second later is the interface arguing with
   * them. Leaving the card clears it, so the next hover plays again.
   */
  const [isPinned, setIsPinned] = useState(false);
  const hasMultiple = images.length > 1;

  /*
   * STATE-04 — the external system is the CLOCK. An interval is the only way to
   * advance a slideshow, and it is torn down the moment the pointer leaves so a
   * grid of 24 cards never has 24 timers running at once.
   */
  useEffect(() => {
    if (!isActive || !hasMultiple || isPinned) return;

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % images.length);
    }, ADVANCE_MS);

    return () => {
      clearInterval(timer);
    };
  }, [isActive, hasMultiple, isPinned, images.length]);

  /*
   * Leaving the card returns it to the frame the operator put first.
   *
   * Adjusted DURING render rather than in an effect: this is derived from a
   * prop changing, not a synchronisation with anything outside React, and
   * `set-state-in-effect` is right to refuse it. React re-renders immediately
   * with the corrected value and nothing in between is painted. The bag
   * provider closes its panel on a route change the same way.
   */
  const [wasActive, setWasActive] = useState(isActive);

  if (isActive !== wasActive) {
    setWasActive(isActive);

    if (!isActive) {
      setIndex(0);
      setIsPinned(false);
    }
  }

  function step(delta: number): void {
    setIsPinned(true);
    setIndex((current) => (current + delta + images.length) % images.length);
  }

  return (
    <div className="rounded-card bg-surface-muted relative aspect-[4/5] w-full overflow-hidden">
      {/*
       * The sold-out dimming belongs HERE, on a wrapper, not on each frame.
       *
       * `cn` resolves conflicting Tailwind classes by keeping the last one, so
       * `opacity-60` on the images overrode the `opacity-0` that hides the
       * inactive ones — every frame rendered at 60% simultaneously, ghosted over
       * each other, and stepping the index changed nothing anyone could see.
       *
       * The controls stay OUTSIDE this wrapper: a sold-out product can still be
       * saved and still deserves to be looked at, so its arrows must not be
       * dimmed along with its photography.
       */}
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
            alt={position === 0 ? alt : ''}
            aria-hidden={position !== 0}
            fill
            sizes={sizes}
            priority={position === 0 && hasPriorityImage}
            className={cn(
              'object-cover transition-opacity duration-500 motion-reduce:transition-none',
              position === index ? 'opacity-100' : 'opacity-0',
            )}
          />
        ))}
      </div>

      {!hasMultiple ? null : (
        <>
          {/*
           * A11Y-01/A11Y-02: real buttons, reachable by keyboard. They are
           * revealed on hover and focus rather than always drawn, so a grid is
           * not a wall of arrows — but `focus-visible` brings them back for
           * anyone tabbing through.
           */}
          <button
            type="button"
            aria-label={t.previousImage}
            onClick={(event) => {
              /*
               * The card is one big link, so a click here would follow it to
               * the product page before the frame ever changed. Stopping the
               * default and the bubble keeps the arrow an arrow.
               */
              event.preventDefault();
              event.stopPropagation();
              step(-1);
            }}
            className="card-frame-control start-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          >
            {/* I18N-05: a chevron is directional and must mirror under RTL. */}
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </button>

          <button
            type="button"
            aria-label={t.nextImage}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              step(1);
            }}
            className="card-frame-control end-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </button>

          {/* Which frame of how many, without a number to read. */}
          <div className="pointer-events-none absolute bottom-2 flex w-full justify-center gap-1">
            {images.map((url, position) => (
              <span
                key={url}
                aria-hidden
                className={cn(
                  'h-1 rounded-full transition-all duration-300',
                  position === index ? 'w-4 bg-white' : 'w-1 bg-white/50',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
