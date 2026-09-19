'use client';

import type { MouseEvent } from 'react';

import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';
import { ChevronLeft, ChevronRight } from '@/lib/vendor/icons';

export interface ProductCardFrameControlsProps {
  /** The frames, by URL — a stable key for each position marker. */
  images: readonly string[];
  index: number;
  onStep: (delta: number) => void;
  messages: Messages;
}

/**
 * The arrows and the position dots over a card's photography.
 *
 * A11Y-01/A11Y-02: real buttons, reachable by keyboard. They are revealed on
 * hover and focus rather than always drawn, so a grid is not a wall of arrows —
 * but `focus-visible` brings them back for anyone tabbing through.
 *
 * On touch they are not drawn at all and the swipe replaces them; see the
 * `(hover: none)` rule in globals.css, which also takes their pointer events away
 * so an invisible arrow cannot eat a tap meant for the product.
 *
 * The card is one big link, so a click on an arrow would follow it to the
 * product page before the frame ever changed. Stopping the default and the
 * bubble keeps the arrow an arrow.
 */
export function ProductCardFrameControls({
  images,
  index,
  onStep,
  messages,
}: ProductCardFrameControlsProps) {
  const t = messages.catalogue;
  const stepBy = (delta: number) => (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onStep(delta);
  };

  return (
    <>
      <button
        type="button"
        aria-label={t.previousImage}
        onClick={stepBy(-1)}
        className="card-frame-control start-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      >
        {/* I18N-05: a chevron is directional and must mirror under RTL. */}
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
      </button>

      <button
        type="button"
        aria-label={t.nextImage}
        onClick={stepBy(1)}
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
              position === index ? 'bg-on-media w-4' : 'bg-on-media/50 w-1',
            )}
          />
        ))}
      </div>
    </>
  );
}
