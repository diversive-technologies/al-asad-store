'use client';

import Image from 'next/image';

import { useMessages } from '@/i18n/use-messages';
import { cn } from '@/lib/utils/cn';
import { ChevronLeft, ChevronRight } from '@/lib/vendor/icons';

import { useSwipeStep } from '../hooks/use-swipe-step';
import { wrapIndex } from '../lib/frame-navigation';
import type { ProductMedia } from '../schemas/product-detail.schema';

export interface GalleryFullscreenStageProps {
  media: readonly ProductMedia[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

/**
 * The full-screen view asks for the screen's width, which is the same file the
 * main frame asked for wherever it is drawn full width or magnified — so the
 * photograph the customer opened is usually already in the browser's cache and
 * appears at once, rather than going blank and loading again.
 */
const STAGE_SIZES = '100vw';

const ARROW_CLASS =
  'bg-surface/90 text-fg shadow-popover hover:bg-surface absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full';

/**
 * The photographs in the full-screen view: every frame, one showing at a time,
 * with a swipe and two arrows to move between them.
 *
 * Every frame is rendered and cross-faded rather than swapping one `src`, the way
 * the card does it, so stepping never shows the empty box of an image still
 * loading. They are `loading="lazy"` inside a closed `<dialog>`, which is
 * `display: none`, so none of them is fetched until the view is opened.
 *
 * The swipe is the card's own (`useSwipeStep`), which leaves pinch-zoom and page
 * gestures to the browser and ignores a pinch, or a pan across a zoomed-in
 * photograph, rather than reading either as a swipe (§30.3).
 *
 * The arrows WRAP instead of disabling at the ends: a disabled button drops the
 * focus of the keyboard user who just pressed it. They are always drawn — a
 * phone has no hover to reveal them — and at 44px they are a thumb's width.
 */
export function GalleryFullscreenStage({
  media,
  activeIndex,
  onSelect,
}: GalleryFullscreenStageProps) {
  const t = useMessages().catalogue;
  const hasMultiple = media.length > 1;
  const step = (delta: number): void => {
    onSelect(wrapIndex(activeIndex + delta, media.length));
  };
  const swipe = useSwipeStep(hasMultiple, step);

  return (
    <div className="relative min-h-0 flex-1" {...swipe}>
      {media.map((item, index) => (
        <Image
          key={item.url}
          src={item.url}
          // A11Y-04: the operator's alt text; the frames not showing are hidden.
          alt={item.alt}
          aria-hidden={index === activeIndex ? undefined : true}
          fill
          sizes={STAGE_SIZES}
          className={cn(
            'object-contain transition-opacity duration-300 motion-reduce:transition-none',
            index === activeIndex ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        />
      ))}

      {!hasMultiple ? null : (
        <>
          <button
            type="button"
            aria-label={t.previousImage}
            onClick={() => {
              step(-1);
            }}
            className={cn(ARROW_CLASS, 'start-3')}
          >
            {/* I18N-05: a chevron is directional and mirrors under RTL. */}
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden />
          </button>

          <button
            type="button"
            aria-label={t.nextImage}
            onClick={() => {
              step(1);
            }}
            className={cn(ARROW_CLASS, 'end-3')}
          >
            <ChevronRight className="h-5 w-5 rtl:rotate-180" aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}
