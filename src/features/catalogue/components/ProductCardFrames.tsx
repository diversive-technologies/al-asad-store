'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

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
  /** The card's link overlay. See the note in `ProductCard` for why it lives here. */
  children?: ReactNode;
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
 * How far a finger must travel across the card before it counts as a swipe.
 *
 * 40px, which is far enough that a tap with a little wobble in it still opens
 * the product — the whole image is a link, so every accidental swipe is a
 * navigation the customer did not ask for, and every missed one is a frame they
 * did not get. The threshold is the only thing separating the two.
 */
const SWIPE_MIN_PX = 40;

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
  children,
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

  /*
   * The swipe.
   *
   * Touch is where this matters: the arrows are revealed by hover, and a phone
   * has none, so on a small screen a swipe is the ONLY way to reach the other
   * four frames. It is also the gesture people already have for photographs, so
   * it needs no affordance drawn on top of the picture.
   *
   * Deliberately no `touchmove` handler and nothing prevented: the page must
   * still scroll vertically under the finger, and the browser only knows to do
   * that if it is left alone. The gesture is judged once, at the end.
   */
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  /*
   * Set by a completed swipe and read by the click that the browser fires
   * afterwards. Without it a swipe would ALSO follow the card's link — the
   * whole image is an anchor, and a drag that ends on it still produces a click
   * in some browsers.
   */
  const didSwipe = useRef(false);

  return (
    <div
      className="rounded-card bg-surface-muted relative aspect-[4/5] w-full overflow-hidden"
      onTouchStart={(event) => {
        const touch = event.touches[0];
        if (touch === undefined) return;

        touchStart.current = { x: touch.clientX, y: touch.clientY };
        didSwipe.current = false;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        touchStart.current = null;

        const touch = event.changedTouches[0];
        if (start === undefined || start === null || touch === undefined) return;
        if (!hasMultiple) return;

        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;

        if (Math.abs(dx) < SWIPE_MIN_PX) return;
        // Mostly vertical means the reader is scrolling the page, not the card.
        if (Math.abs(dx) <= Math.abs(dy)) return;

        didSwipe.current = true;

        /*
         * I18N-05 — the gesture mirrors under RTL. Dragging content towards the
         * reading-end edge means "forwards" in both directions, which is what
         * every native photo viewer does. Read from the document at event time
         * rather than from a prop, so there is nothing to get out of step and
         * no hydration-time guess about direction.
         */
        const isRtl = event.currentTarget.ownerDocument.documentElement.dir === 'rtl';
        const isForward = isRtl ? dx > 0 : dx < 0;

        step(isForward ? 1 : -1);
      }}
      onClickCapture={(event) => {
        if (!didSwipe.current) return;

        // Captured on the way DOWN, so the anchor never sees it.
        event.preventDefault();
        event.stopPropagation();
        didSwipe.current = false;
      }}
    >
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

      {children}

      {!hasMultiple ? null : (
        <>
          {/*
           * A11Y-01/A11Y-02: real buttons, reachable by keyboard. They are
           * revealed on hover and focus rather than always drawn, so a grid is
           * not a wall of arrows — but `focus-visible` brings them back for
           * anyone tabbing through.
           *
           * On touch they are not drawn at all and the swipe replaces them; see
           * the `(hover: none)` rule in globals.css, which also takes their
           * pointer events away so an invisible arrow cannot eat a tap meant
           * for the product.
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
