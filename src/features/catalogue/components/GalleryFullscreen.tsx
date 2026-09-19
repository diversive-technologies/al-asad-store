'use client';

import type { KeyboardEvent } from 'react';

import { FullscreenDialog } from '@/components/ui/dialog';
import type { Locale } from '@/i18n/locales';
import { useMessages } from '@/i18n/use-messages';
import { formatTemplate } from '@/lib/utils/format';

import { frameForKey } from '../lib/frame-navigation';
import type { ProductMedia } from '../schemas/product-detail.schema';
import { GalleryFullscreenFooter } from './GalleryFullscreenFooter';
import { GalleryFullscreenStage } from './GalleryFullscreenStage';

export interface GalleryFullscreenProps {
  isOpen: boolean;
  onClose: () => void;
  media: readonly ProductMedia[];
  /** The frame showing — the SAME position as the page's gallery. */
  activeIndex: number;
  onSelect: (index: number) => void;
  productName: string;
  locale: Locale;
}

/**
 * §28.2's tap-to-fullscreen: the product's photographs as large as the screen
 * allows, on the native `<dialog>` (`FullscreenDialog`, A11Y-08), which gives
 * the focus trap, `Escape`, and focus handed back to the photograph on closing.
 *
 * It shares its frame position with the page's gallery rather than keeping its
 * own (STATE-03): it opens on the photograph that was tapped, and closing it
 * leaves the page showing the photograph the customer stopped on.
 *
 * Ways between frames, for every kind of hand: a swipe and two arrows on the
 * stage, the thumbnails under it, and the arrow keys, Home and End anywhere in
 * the view. The keys are on the dialog, so they work while focus is still on
 * the close button it opens with; the arrows follow the reading direction,
 * read from the document at the moment of the key press (I18N-03).
 */
export function GalleryFullscreen({
  isOpen,
  onClose,
  media,
  activeIndex,
  onSelect,
  productName,
  locale,
}: GalleryFullscreenProps) {
  const t = useMessages().product;

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>): void => {
    const next = frameForKey({
      key: event.key,
      isRtl: event.currentTarget.ownerDocument.documentElement.dir === 'rtl',
      hasModifier: event.altKey || event.ctrlKey || event.metaKey,
      index: activeIndex,
      count: media.length,
    });
    if (next === null) return;

    event.preventDefault();
    onSelect(next);
  };

  return (
    <FullscreenDialog
      isOpen={isOpen}
      onClose={onClose}
      title={formatTemplate(t.fullscreenTitle, { name: productName })}
      closeLabel={t.closeFullscreen}
      onKeyDown={onKeyDown}
    >
      <GalleryFullscreenStage media={media} activeIndex={activeIndex} onSelect={onSelect} />

      {media.length < 2 ? null : (
        <GalleryFullscreenFooter
          isOpen={isOpen}
          media={media}
          activeIndex={activeIndex}
          onSelect={onSelect}
          locale={locale}
        />
      )}
    </FullscreenDialog>
  );
}
