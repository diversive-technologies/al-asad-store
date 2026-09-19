'use client';

import { useEffect, useRef } from 'react';

import Link from 'next/link';

import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';

export interface PasswordResetSentProps {
  readonly messages: Messages;
}

/**
 * What the reset form becomes once the request has been accepted. One sentence
 * whatever the backend found, for the reason `PasswordResetForm` gives.
 *
 * A11Y-05 — the form it replaces takes the pressed button with it, so the
 * browser would drop focus to the page, and a live region inserted with its words
 * already in it is not reliably announced. The sentence TAKES focus when it
 * appears instead, which is also what reads it out (as `SavedSizeConfirmation`
 * does): never in the tab order, focusable by the page.
 */
export function PasswordResetSent({ messages }: PasswordResetSentProps) {
  const line = useRef<HTMLParagraphElement>(null);

  // DOM focus is the external system (STATE-04): once, when the outcome appears.
  useEffect(() => {
    line.current?.focus();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <p ref={line} role="status" tabIndex={-1} className="text-fg text-sm">
        {messages.auth.resetSent}
      </p>
      <Link href={ROUTES.signIn} className="text-fg-muted hover:text-fg text-sm underline">
        {messages.auth.backToSignIn}
      </Link>
    </div>
  );
}
