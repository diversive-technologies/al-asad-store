'use client';

import { useEffect, useRef } from 'react';

export interface SavedSizeConfirmationProps {
  readonly message: string;
}

/**
 * What a change to the saved sizes just did, said where the pressed control was.
 *
 * Both controls that change the list are REMOVED by their own success — "Remember
 * size M" goes once M is saved, and "Forget" goes with its row — so the browser
 * would drop focus to the page. This line takes it when it appears, which is also
 * what reads it out (A11Y-05); a live region inserted with its words already in
 * it is not reliably announced. Mount it with a `key` per change, so a second
 * change is focused and read too.
 */
export function SavedSizeConfirmation({ message }: SavedSizeConfirmationProps) {
  const line = useRef<HTMLParagraphElement>(null);

  // DOM focus is the external system (STATE-04): once, when the result appears.
  useEffect(() => {
    line.current?.focus();
  }, []);

  return (
    <p ref={line} role="status" tabIndex={-1} className="text-fg-muted text-sm">
      {message}
    </p>
  );
}
