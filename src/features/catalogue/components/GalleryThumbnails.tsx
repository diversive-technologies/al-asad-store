'use client';

import { useRef } from 'react';

import Image from 'next/image';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';
import { formatNumber, formatTemplate } from '@/lib/utils/format';

import { useThumbnailFollow } from '../hooks/use-thumbnail-follow';
import type { ProductMedia } from '../schemas/product-detail.schema';

export interface GalleryThumbnailsProps {
  media: readonly ProductMedia[];
  activeIndex: number;
  onSelect: (index: number) => void;
  messages: Messages;
  /** Each thumbnail's number is a number in the reader's language (I18N-08). */
  locale: Locale;
  /**
   * Whether the strip can be seen, so it keeps its current thumbnail in view
   * (`useThumbnailFollow`). The page's strip always can; the full-screen view's
   * only while the view is open.
   */
  isShown?: boolean;
  /** CMP-12 — merged last, so the full-screen view can centre the strip. */
  className?: string;
}

const THUMB_SIZES = '5rem';

/**
 * The gallery's thumbnails: ONE line that scrolls, rather than wrapping onto a
 * second row.
 *
 * Wrapping made the gallery's height depend on how many shots a garment happens
 * to have, so the buy box moved down the page from one product to the next. A
 * scrolling strip is a fixed height whatever the count, and the overflow is the
 * affordance: a half-visible thumbnail at the edge says there are more without
 * needing a control to say it.
 *
 * `overflow-x`, not a logical property — the inline axis IS the horizontal one in
 * both locales here, and the scroller starts at the reading edge under
 * `dir="rtl"` on its own. The thin themed scrollbar comes from the global rule
 * that already covers nested scrollers.
 *
 * Real `<button>`s in a real list (A11Y-01), so they are keyboard-operable with
 * none of their own key handling.
 *
 * The strip keeps the current thumbnail in view whichever way the frame changed
 * — here, by swipe or key in the full-screen view, or by the arrows — scrolling
 * itself and never the page (`useThumbnailFollow`).
 */
export function GalleryThumbnails({
  media,
  activeIndex,
  onSelect,
  messages,
  locale,
  isShown = true,
  className,
}: GalleryThumbnailsProps) {
  const t = messages.product;
  const listRef = useRef<HTMLUListElement>(null);
  useThumbnailFollow(listRef, activeIndex, isShown);

  return (
    <ul
      ref={listRef}
      aria-label={t.galleryLabel}
      className={cn('flex gap-2 overflow-x-auto pb-1', className)}
    >
      {media.map((item, index) => (
        // CMP-10: the asset URL is the stable key, not the array index.
        <li key={item.url} className="shrink-0">
          <button
            type="button"
            onClick={() => {
              onSelect(index);
            }}
            // A11Y: says which shot is showing, not just which is styled.
            aria-current={index === activeIndex ? 'true' : undefined}
            aria-label={formatTemplate(t.viewImage, { index: formatNumber(index + 1, locale) })}
            className={cn(
              'rounded-card bg-surface-muted relative size-20 overflow-hidden',
              index === activeIndex ? 'ring-brand-600 ring-2' : 'opacity-70 hover:opacity-100',
            )}
          >
            <Image
              src={item.url}
              alt=""
              aria-hidden
              fill
              sizes={THUMB_SIZES}
              className="object-cover"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
