'use client';

import { useEffect, useRef } from 'react';

import Link from 'next/link';

export interface ResetNoticeProps {
  /** The sentence, already resolved copy (ERR-11). */
  readonly message: string;
  readonly linkHref: string;
  readonly linkLabel: string;
  /**
   * Take focus when it appears. True when it REPLACES a form the customer just
   * pressed a button on; false when it is the page's own first content, where
   * moving focus would be the page grabbing it.
   */
  readonly takeFocus: boolean;
}

/**
 * What a password-reset screen becomes once it has an answer: one sentence and
 * one way on. The three screens that end this way (a link on its way, a password
 * changed, a link no good) are this one component with different words (PD-01).
 *
 * A11Y-05 — the form it replaces takes the pressed button with it, so the browser
 * would drop focus to the page, and a live region inserted with its words already
 * in it is not reliably announced. The sentence TAKES focus when it appears
 * instead, which is also what reads it out (as `SavedSizeConfirmation` does):
 * never in the tab order, focusable by the page.
 */
export function ResetNotice({ message, linkHref, linkLabel, takeFocus }: ResetNoticeProps) {
  const line = useRef<HTMLParagraphElement>(null);

  // DOM focus is the external system (STATE-04): once, when the outcome appears.
  useEffect(() => {
    if (takeFocus) line.current?.focus();
  }, [takeFocus]);

  return (
    <div className="flex flex-col gap-4">
      <p ref={line} role="status" tabIndex={-1} className="text-fg text-sm">
        {message}
      </p>
      <Link href={linkHref} className="text-fg-muted hover:text-fg text-sm underline">
        {linkLabel}
      </Link>
    </div>
  );
}
