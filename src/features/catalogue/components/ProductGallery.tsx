'use client';

import { useState } from 'react';

import Image from 'next/image';

import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';
import { formatTemplate } from '@/lib/utils/format';

import type { ProductMedia } from '../schemas/product-detail.schema';

export interface ProductGalleryProps {
  media: readonly ProductMedia[];
  productName: string;
  messages: Messages;
}

const MAIN_SIZES = '(min-width: 1024px) 50vw, 100vw';
const THUMB_SIZES = '5rem';

/**
 * §28.2's gallery.
 *
 * MOD-06 — a client boundary, because choosing a shot is local, ephemeral state
 * that nobody should be able to link to. STATE-01 rung 2: `useState` in the
 * component that owns it, not the URL, because a gallery position is not a
 * page (§30.5 wants ONE canonical address per product).
 *
 * The thumbnails are real `<button>`s in a real list (A11Y-01), so they are
 * keyboard-operable without any of their own key handling.
 *
 * Not yet built, and deliberately not faked: the desktop magnifier and mobile
 * tap-to-fullscreen §28.2 also asks for. Both are their own interaction with
 * their own accessibility contract, and a half-magnifier would be worse than
 * none.
 */
export function ProductGallery({ media, productName, messages }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const t = messages.product;

  // STATE-03: the shown image is derived from the index, never stored twice.
  const active = media[activeIndex] ?? media[0];
  if (active === undefined) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-card bg-surface-muted relative aspect-[4/5] w-full overflow-hidden">
        <Image
          src={active.url}
          /*
           * A11Y-04: the operator's alt text when there is one. The gallery's
           * later shots are additional views of a thing the page already names,
           * so an empty alt is correct rather than lazy — repeating the product
           * name four times is noise to a screen reader.
           */
          alt={active.alt.length > 0 ? active.alt : ''}
          fill
          sizes={MAIN_SIZES}
          priority
          className="object-cover"
        />
      </div>

      {/*
       * ONE line that scrolls, rather than wrapping onto a second row.
       *
       * Wrapping made the gallery's height depend on how many shots a garment
       * happens to have, so the buy box moved down the page from one product
       * to the next. A scrolling strip is a fixed height whatever the count,
       * and the overflow is the affordance: a half-visible thumbnail at the
       * edge says there are more without needing a control to say it.
       *
       * `overflow-x`, not a logical property — the inline axis IS the
       * horizontal one in both locales here, and the scroller starts at the
       * reading edge under `dir="rtl"` on its own. The thin themed scrollbar
       * comes from the global rule that already covers nested scrollers.
       */}
      {media.length < 2 ? null : (
        <ul aria-label={t.galleryLabel} className="flex gap-2 overflow-x-auto pb-1">
          {media.map((item, index) => (
            // CMP-10: the asset URL is the stable key, not the array index.
            <li key={item.url} className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveIndex(index);
                }}
                // A11Y: says which shot is showing, not just which is styled.
                aria-current={index === activeIndex ? 'true' : undefined}
                aria-label={formatTemplate(t.viewImage, { index: String(index + 1) })}
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
      )}

      <span className="sr-only">{productName}</span>
    </div>
  );
}
