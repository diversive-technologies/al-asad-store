'use client';

import { useState } from 'react';

import { LoadingNotice } from '@/components/shared/LoadingNotice';
import { OnDemand } from '@/components/shared/OnDemand';
import { onDemandPart } from '@/hooks/use-on-demand';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import type { ProductMedia } from '../schemas/product-detail.schema';
import { GalleryFrame } from './GalleryFrame';
import { GalleryThumbnails } from './GalleryThumbnails';

/*
 * Deliberate code split (IMP-01a, PERF-06, PERF-10): the full-screen view is
 * opened on demand, so its dialog, stage, swipe and keyboard stepping are
 * fetched when the customer reaches for the gallery rather than with the page,
 * and drawn on the first open. Once drawn it stays, so every later opening is
 * what it always was. A press that beats the download is answered under the
 * gallery in words, and one that fails says so there with Try again
 * (`useOnDemand`), rather than a tap that seems to do nothing.
 */
const fullscreen = onDemandPart(() => import('./GalleryFullscreen'));

export interface ProductGalleryProps {
  media: readonly ProductMedia[];
  productName: string;
  locale: Locale;
  messages: Messages;
}

/**
 * §28.2's gallery: the main photograph with its desktop magnifier, the
 * thumbnails, and the tap-to-fullscreen view.
 *
 * MOD-06 — a client boundary, because choosing a shot and opening the view are
 * local, ephemeral state that nobody should be able to link to. STATE-01 rung 2:
 * `useState` in the component that owns it, not the URL, because a gallery
 * position is not a page (§30.5 wants ONE canonical address per product).
 *
 * ONE frame position for the page and the full-screen view (STATE-03), so the
 * view opens on the photograph that was chosen and closing it leaves the page on
 * the photograph the customer stopped at.
 *
 * A11Y-04: the operator's alt text when there is one. The gallery's later shots
 * are additional views of a thing the page already names, so an empty alt is
 * correct rather than lazy — repeating the product name four times is noise to a
 * screen reader.
 *
 * The page's own width is untouched: the frame's box is fixed by its aspect
 * ratio, and the thumbnail strip scrolls inside the `grid-cols-1` column that
 * `ProductScreen` gives it.
 */
export function ProductGallery({ media, productName, locale, messages }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  if (isFullscreen && !hasOpened) setHasOpened(true);

  // STATE-03: the shown image is derived from the index, never stored twice.
  const active = media[activeIndex] ?? media[0];
  if (active === undefined) return null;

  return (
    <div
      className="flex flex-col gap-3"
      onPointerEnter={fullscreen.warm}
      onFocus={fullscreen.warm}
      onTouchStart={fullscreen.warm}
    >
      <GalleryFrame
        item={active}
        index={activeIndex}
        count={media.length}
        onOpen={() => {
          setIsFullscreen(true);
        }}
        locale={locale}
        messages={messages}
      />

      {media.length < 2 ? null : (
        <GalleryThumbnails
          media={media}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
          messages={messages}
          locale={locale}
        />
      )}

      {hasOpened ? (
        <OnDemand part={fullscreen} loading={<LoadingNotice />}>
          {(view) => (
            <view.GalleryFullscreen
              isOpen={isFullscreen}
              onClose={() => {
                setIsFullscreen(false);
              }}
              media={media}
              activeIndex={activeIndex}
              onSelect={setActiveIndex}
              productName={productName}
              locale={locale}
            />
          )}
        </OnDemand>
      ) : null}
    </div>
  );
}
