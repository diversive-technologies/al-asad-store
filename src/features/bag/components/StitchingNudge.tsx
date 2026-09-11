import Link from 'next/link';

import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';
import { ChevronRight } from '@/lib/vendor/icons';

export interface StitchingNudgeProps {
  messages: Messages;
}

/**
 * §34's bag nudge — the product page's fork at panel scale, glyph for glyph:
 * measure line, text column, call to action with a chevron. Two surfaces, one
 * shape, one implementation.
 *
 * A standing invitation, deliberately NOT a claim about any line above it: a bag
 * line carries no stitching offer, and deciding here which of them the workshop
 * would cut would be the interface inventing a catalogue rule (DATA-13).
 *
 * THE DASHED GREY BOX IS GONE. Its dashes were the right instinct in the wrong
 * colour and the wrong shape: a grey dashed rectangle is the drop-zone and
 * empty-state idiom, which is exactly why it read as a placeholder, and a box
 * inside the bag panel is a card nested in a surface that has none. The same
 * dashes, in gold, on ONE edge, are the measure line.
 *
 * Nothing shares a line any more. At 390px the panel's inner width is about
 * 324px; the old row gave the question roughly 134px between a fixed glyph and a
 * call to action pinned to the reading end, so it wrapped to three lines. Stacked,
 * the question gets the full width and the call to action sits under it.
 */
export function StitchingNudge({ messages }: StitchingNudgeProps) {
  const t = messages.bag;

  return (
    <Link
      href={ROUTES.stitched}
      className="group rounded-card mt-6 flex flex-col items-start gap-3"
    >
      <span aria-hidden className="measure-line" />

      <span className="flex flex-col items-start gap-1.5">
        {/* 12px muted body in a panel is under the readability floor, and this is
            the one thing in the bag nobody came looking for. */}
        <span className="text-fg-muted text-sm text-pretty">{t.stitchingNudge}</span>

        {/* `text-brand-600` measured 2.82:1 on the dark surface — a real A11Y-07
            failure. `text-fg` plus an underline carries "link" in both themes, and
            is the treatment `ProductRailSection` already uses for View all. */}
        <span className="text-fg inline-flex items-center gap-1 text-sm font-medium underline decoration-1 underline-offset-4">
          {t.stitchingNudgeCta}
          {/* I18N-05: directional, so it mirrors under RTL. */}
          <ChevronRight aria-hidden className="size-3.5 rtl:rotate-180" />
        </span>
      </span>
    </Link>
  );
}
