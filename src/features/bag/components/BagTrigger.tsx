'use client';

import type { Messages } from '@/i18n/messages/en';
import { ShoppingBag } from '@/lib/vendor/icons';

import { useBag } from './BagProvider';

export interface BagTriggerProps {
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
export function BagTrigger({ messages }: BagTriggerProps) {
  const t = messages.bag;
  const { open, bag } = useBag();

  // STATE-03: derived at render from the server's own count, never stored.
  const count = bag.data?.itemCount ?? 0;

  return (
    <button
      type="button"
      onClick={open}
      /*
       * A11Y-04 — the accessible name carries the COUNT, so a screen reader
       * hears "Open bag, 2 items" rather than a bare "Open bag" with the number
       * visible only as decoration. I18N-07: both plural forms come from the
       * registry; nothing appends an "s".
       */
      aria-label={`${t.open}, ${count === 1 ? t.itemsOne : t.itemsOther.replace('{count}', String(count))}`}
      className="text-fg hover:text-fg-muted focus-visible:ring-brand-500 relative rounded-full p-2 focus-visible:ring-2 focus-visible:outline-none"
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
          className="bg-brand-600 absolute top-0 end-0 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] leading-none font-medium text-white"
        >
          {count}
        </span>
      )}
    </button>
  );
}
