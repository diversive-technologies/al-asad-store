'use client';

import type { Locale } from '@/i18n/locales';
import { useMessages } from '@/i18n/use-messages';
import { formatNumber, formatTemplate } from '@/lib/utils/format';

import type { ProductMedia } from '../schemas/product-detail.schema';
import { GalleryThumbnails } from './GalleryThumbnails';

export interface GalleryFullscreenFooterProps {
  /** Whether the view is open — the strip is only scrolled while it can be seen. */
  isOpen: boolean;
  media: readonly ProductMedia[];
  activeIndex: number;
  onSelect: (index: number) => void;
  locale: Locale;
}

/**
 * Under the full-screen photograph: which frame this is, and every frame to
 * choose from.
 *
 * The position is a `role="status"` line, so a screen reader hears "Image 3 of
 * 5" each time the frame changes — by swipe, arrow, key or thumbnail — without
 * focus being moved to say it.
 *
 * The thumbnails are the page's own strip (PD-01), centred where there is room
 * and scrolling where there is not, and keeping the current one in view while
 * the view is open. On a short screen — a phone on its side — they give their
 * height to the photograph (`gallery-strip`); the swipe, the arrows and the keys
 * still reach every frame.
 */
export function GalleryFullscreenFooter({
  isOpen,
  media,
  activeIndex,
  onSelect,
  locale,
}: GalleryFullscreenFooterProps) {
  const messages = useMessages();

  return (
    <div className="flex flex-col gap-2 px-4 pt-2 pb-4">
      <p role="status" className="text-fg-muted text-center text-sm">
        {formatTemplate(messages.product.imagePosition, {
          index: formatNumber(activeIndex + 1, locale),
          count: formatNumber(media.length, locale),
        })}
      </p>
      <div className="gallery-strip">
        <GalleryThumbnails
          media={media}
          activeIndex={activeIndex}
          onSelect={onSelect}
          messages={messages}
          locale={locale}
          isShown={isOpen}
          className="justify-center-safe motion-safe:scroll-smooth"
        />
      </div>
    </div>
  );
}
