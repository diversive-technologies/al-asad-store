'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { useMessages } from '@/i18n/use-messages';

export interface OnDemandFailureProps {
  /** Asks for the part again. */
  readonly onRetry: () => void;
  /** Another way on beside Try again — back to what the customer was doing. */
  readonly children?: ReactNode;
}

/**
 * What a part of the page fetched on demand says when its code could not be
 * downloaded (`useOnDemand`), in place of the part — so the page around it,
 * and whatever the customer typed into it, stays where it was.
 *
 * The words are an alert (A11Y-05), and focus comes to Try again: whatever held
 * it went with the press that asked for this part, or with the Try again that
 * asked again.
 */
export function OnDemandFailure({ onRetry, children }: OnDemandFailureProps) {
  const t = useMessages().common;
  const retryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    retryRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col items-start gap-3">
      <p role="alert" className="text-fg text-sm">
        {t.partUnavailable}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button ref={retryRef} type="button" variant="secondary" size="sm" onClick={onRetry}>
          {t.retry}
        </Button>
        {children}
      </div>
    </div>
  );
}
