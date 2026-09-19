'use client';

import type { PointerEvent } from 'react';

import Image from 'next/image';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatNumber, formatTemplate } from '@/lib/utils/format';
import { Maximize2 } from '@/lib/vendor/icons';

import { magnifierOrigin } from '../lib/magnifier';
import type { ProductMedia } from '../schemas/product-detail.schema';

export interface GalleryFrameProps {
  /** The frame being shown. */
  item: ProductMedia;
  /** Its position among the product's frames, from 0. */
  index: number;
  count: number;
  onOpen: () => void;
  locale: Locale;
  messages: Messages;
}

/**
 * Which file the browser fetches for the main photograph.
 *
 * Where the primary pointer hovers finely the frame can be MAGNIFIED to twice
 * its size (`gallery-frame` in globals.css), so there it asks for twice the width
 * it is drawn at: 100vw beside the buy box from 1024px, 200vw in a narrower
 * window. That is what lets the magnifier enlarge the image already on screen
 * instead of fetching a second, larger one on the first hover. Everywhere else it
 * asks for what it draws. The factor of 2 here and `--magnifier-scale` have to
 * agree.
 *
 * The cost is a larger file on a 1x desktop screen; a 2x screen was already
 * fetching close to the full-size file for the plain frame. The image service
 * never enlarges past the photograph's own width, so asking for more than exists
 * costs nothing beyond the original.
 *
 * The quality is left at the default: Next 16 serves only the qualities listed in
 * `images.qualities`, and raising it would enlarge every photograph for every
 * visitor, magnified or not.
 */
const FRAME_SIZES =
  '(hover: hover) and (pointer: fine) and (min-width: 1024px) 100vw, (hover: hover) and (pointer: fine) 200vw, (min-width: 1024px) 50vw, 100vw';

/**
 * Points the magnifier at the pointer.
 *
 * STY-01a — a pointer position is a continuous runtime value that no class can
 * enumerate, so it is handed to the stylesheet as two CSS custom properties.
 * They are written straight to the element rather than through state: a React
 * render per pointer event would re-render the gallery sixty times a second to
 * move a transform origin.
 *
 * A finger is ignored. A touchscreen has no hover to follow — the stylesheet only
 * magnifies under `(hover: hover) and (pointer: fine)` — and a tap opens the
 * full-screen view instead.
 */
function followPointer(event: PointerEvent<HTMLDivElement>): void {
  if (event.pointerType === 'touch') return;

  const frame = event.currentTarget;
  const origin = magnifierOrigin(event, frame.getBoundingClientRect());
  frame.style.setProperty('--magnifier-x', `${String(origin.x)}%`);
  frame.style.setProperty('--magnifier-y', `${String(origin.y)}%`);
}

/**
 * The product page's main photograph: §28.2's desktop magnifier and its
 * tap-to-fullscreen, which are one control seen from two kinds of device.
 *
 * - A mouse or trackpad pointer magnifies the photograph in place, following the
 *   pointer, and a click opens the full-screen view.
 * - A tap on a touch device opens the full-screen view, where the frames can be
 *   swiped and pinch-zoomed.
 * - A keyboard user reaches the same button and gets the full-screen view: the
 *   magnifier follows a pointer, and there is none to follow.
 *
 * The button is an OVERLAY beside the image rather than its wrapper, so the
 * image keeps its own alt text in the accessibility tree instead of having it
 * replaced by the button's name. It also sits OUTSIDE the photograph's clip, so
 * the global focus ring is drawn around the frame rather than cut off by it.
 *
 * The frame's box is fixed by its aspect ratio and the enlargement is a
 * transform inside a clip, so magnifying moves nothing on the page (PERF-08).
 */
export function GalleryFrame({ item, index, count, onOpen, locale, messages }: GalleryFrameProps) {
  const t = messages.product;

  return (
    <div
      className="gallery-frame relative aspect-4/5 w-full"
      onPointerEnter={followPointer}
      onPointerMove={followPointer}
    >
      {/* `isolate` keeps the rounded clip holding while the scale is composited. */}
      <div className="rounded-card bg-surface-muted absolute inset-0 isolate overflow-hidden">
        <Image
          src={item.url}
          // A11Y-04: the operator's alt text; empty on the further views.
          alt={item.alt}
          fill
          sizes={FRAME_SIZES}
          // PERF-07: the page's largest paint. Next 16 deprecates `priority` for these two.
          loading="eager"
          fetchPriority="high"
          className="gallery-frame-image object-cover"
        />
      </div>

      <button
        type="button"
        onClick={(event) => {
          /*
           * The dialog hands focus back to whatever held it when it opened. Safari
           * does not focus a button on a click or a tap, so without this focus
           * would return to the top of the page rather than to the photograph.
           */
          event.currentTarget.focus();
          onOpen();
        }}
        aria-label={formatTemplate(t.openFullscreen, {
          index: formatNumber(index + 1, locale),
          count: formatNumber(count, locale),
        })}
        className="rounded-card absolute inset-0 cursor-zoom-in"
      >
        {/*
         * Says the photograph opens larger — on a touch device there is no cursor
         * to say it. Not a control of its own: the whole frame is the button. The
         * glyph is not directional, so it does not mirror (I18N-05).
         */}
        <span className="gallery-frame-hint bg-surface/90 text-fg shadow-popover absolute end-3 bottom-3 grid size-9 place-items-center rounded-full">
          <Maximize2 className="h-4 w-4" aria-hidden />
        </span>
      </button>
    </div>
  );
}
