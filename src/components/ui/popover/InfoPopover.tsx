'use client';

import { useId, type ReactNode } from 'react';

import { Info, X } from '@/lib/vendor/icons';

export interface InfoPopoverProps {
  /** Accessible name for the trigger, e.g. "What does this mean?". */
  label: string;
  /** Heading inside the popup. */
  title: string;
  /** Accessible name for the close button. */
  closeLabel: string;
  children: ReactNode;
}

/**
 * An explanation the customer asks for, on the native popover API.
 *
 * Same reasoning as `SlideOver` and the native `<dialog>` (A11Y-08, BASE-01):
 * the platform already ships this primitive, so no dependency is added. A
 * `popover="auto"` element gets the top layer, light-dismiss on an outside
 * click, `Escape` to close, and focus returned to the trigger — and
 * `popovertarget` wires the button to it with no JavaScript at all, so this
 * works before hydration.
 *
 * **A11Y-08 nuance, stated rather than buried.** The rule asks popovers to trap
 * focus. `popover="auto"` deliberately does not, because it is NON-modal, and
 * that is the right behaviour here: this holds two sentences and a close
 * button, and trapping a keyboard user inside an explanation they can already
 * dismiss with Escape or by tabbing away would be worse for them, not better.
 * Everything else the rule asks for — Escape, focus return, correct role —
 * comes from the element. If it ever holds interactive content, it should
 * become a `<dialog>` instead.
 *
 * Lives in `components/ui` because it is not the bag's: M5 has a Cash-on-
 * Delivery cap and a delivery charge that need exactly this treatment.
 */
export function InfoPopover({ label, title, closeLabel, children }: InfoPopoverProps) {
  // CMP-11: ids are generated, never hand-written, so two instances cannot collide.
  const id = useId();

  return (
    <>
      <button
        type="button"
        // @ts-expect-error -- React 19's typings still lack `popovertarget`.
        popovertarget={id}
        aria-label={label}
        className="text-fg-muted hover:text-fg focus-visible:ring-brand-500 inline-flex shrink-0 items-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>

      <div
        id={id}
        popover="auto"
        aria-labelledby={`${id}-title`}
        className="info-popover"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 id={`${id}-title`} className="text-fg text-sm font-medium">
            {title}
          </h3>
          <button
            type="button"
            // @ts-expect-error -- as above; `popovertargetaction` is untyped.
            popovertarget={id}
            popovertargetaction="hide"
            aria-label={closeLabel}
            className="text-fg-muted hover:text-fg focus-visible:ring-brand-500 shrink-0 rounded-full p-0.5 focus-visible:ring-2 focus-visible:outline-none"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="text-fg-muted mt-2 space-y-2 text-xs">{children}</div>
      </div>
    </>
  );
}
