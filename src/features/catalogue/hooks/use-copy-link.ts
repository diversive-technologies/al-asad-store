'use client';

import { useEffect, useState } from 'react';

import { copyText } from '@/lib/utils/clipboard';

/**
 * What the last press of "Copy link" came to.
 *
 * `MANUAL` is the browser refusing to copy — the link is then SHOWN for the
 * customer to copy themselves, rather than the button pretending. `attempt`
 * counts presses, so the same confirmation announced twice is heard twice: the
 * words are re-rendered under a new key inside a live region that stays put.
 */
export type CopyOutcome =
  | { readonly kind: 'IDLE'; readonly attempt: number }
  | { readonly kind: 'COPIED'; readonly attempt: number }
  | { readonly kind: 'MANUAL'; readonly attempt: number };

export interface UseCopyLinkResult {
  outcome: CopyOutcome;
  copy: () => void;
}

/** Long enough to be read and heard; short enough that the next press is news. */
const CONFIRMATION_MS = 4000;

/**
 * §28.2's copy-link sharing: copies `url` and reports honestly what happened.
 *
 * A confirmation that stays on screen stops meaning anything, so `COPIED` settles
 * back to `IDLE` on its own. `MANUAL` does NOT: the field it shows is how the
 * customer gets the link, and taking it away on a timer would take it away from
 * someone still copying it.
 */
export function useCopyLink(url: string): UseCopyLinkResult {
  const [outcome, setOutcome] = useState<CopyOutcome>({ kind: 'IDLE', attempt: 0 });

  useEffect(() => {
    // STATE-04: the external system is the clock the confirmation is shown against.
    if (outcome.kind !== 'COPIED') return;

    const timer = setTimeout(() => {
      setOutcome((current) => ({ kind: 'IDLE', attempt: current.attempt }));
    }, CONFIRMATION_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [outcome]);

  function copy(): void {
    // `copyText` answers rather than rejects, so there is no failure channel to lose.
    void copyText(url).then((isCopied) => {
      setOutcome((current) => ({
        kind: isCopied ? 'COPIED' : 'MANUAL',
        attempt: current.attempt + 1,
      }));
    });
  }

  return { outcome, copy };
}
