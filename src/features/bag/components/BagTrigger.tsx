'use client';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatNumber, formatPlural } from '@/lib/utils/format';
import { ShoppingBag } from '@/lib/vendor/icons';

import { preloadBagPanel } from './BagPanel';
import { useBag } from './BagProvider';

export interface BagTriggerProps {
  locale: Locale;
  messages: Messages;
}

/**
 * The header's bag control.
 *
 * It is a BUTTON, not a link to `/bag`, because it opens a dialog rather than
 * navigating (A11Y-01 cuts both ways: a control that does not navigate must not
 * be an `<a>`). `/bag` still exists as a full page — it is the address a
 * customer can bookmark or land on, and the panel is the fast path.
 */
export function BagTrigger({ locale, messages }: BagTriggerProps) {
  const t = messages.bag;
  const { open, bag } = useBag();

  // STATE-03: derived at render from the server's own count, never stored.
  const count = bag.data?.itemCount ?? 0;

  return (
    <button
      type="button"
      onClick={() => {
        /* DATA-09 — opening the bag to look at it reads it again: the header's
           copy may be half an hour old, with holds that have since lapsed. */
        open();
        void bag.refetch();
      }}
      // What the panel shows is fetched on first open; reaching for the button starts it early.
      onPointerEnter={preloadBagPanel}
      onFocus={preloadBagPanel}
      onTouchStart={preloadBagPanel}
      /*
       * A11Y-04 — the accessible name carries the COUNT, so a screen reader
       * hears "Open bag, 2 items" rather than a bare "Open bag" with the number
       * visible only as decoration. I18N-06: one parameterised message, not two
       * strings joined here; I18N-07: its plural forms come from the registry.
       */
      aria-label={formatPlural(t.openWithCount, count, locale)}
      /*
       * No `text-fg`. Over the hero the header sets `color: on-media`, and a
       * pinned colour does not inherit it — which left this icon in the theme's
       * foreground colour on top of a light film, where it nearly vanished.
       * Inheriting is what makes the bar's transparent and solid states both
       * legible. `opacity` dims on hover instead, because that works whatever
       * the inherited colour turns out to be.
       */
      className="focus-visible:ring-brand-500 relative rounded-full p-2 transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:outline-none"
    >
      <ShoppingBag className="h-5 w-5" aria-hidden />

      {count === 0 ? null : (
        <span
          // A11Y-04: the label above already says it, so the badge is decorative.
          aria-hidden
          /*
           * `top-0 end-0`, NOT `inset-block-start-0 inset-inline-end-0`: those
           * two are CSS property names, not Tailwind utilities, so they
           * compiled to nothing and the badge fell out of the corner and hung
           * below the icon. `end-0` is the logical inline edge and still
           * mirrors under `dir="rtl"`; `top-0` is the block edge, which does
           * not flip in a horizontal writing mode.
           */
          className="bg-brand-600 absolute end-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] leading-none font-medium text-white"
        >
          {formatNumber(count, locale)}
        </span>
      )}
    </button>
  );
}
