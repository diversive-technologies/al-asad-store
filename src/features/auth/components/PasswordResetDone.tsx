'use client';

import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';

import { ResetNotice } from './ResetNotice';

export interface PasswordResetDoneProps {
  readonly messages: Messages;
}

/**
 * F-03 — the password has been changed. The customer is not signed in by it (a
 * link in an email is a weaker proof than a password), so the way on is the
 * sign-in screen. It replaces the form, so it takes focus.
 */
export function PasswordResetDone({ messages }: PasswordResetDoneProps) {
  return (
    <ResetNotice
      message={messages.auth.resetDone}
      linkHref={ROUTES.signIn}
      linkLabel={messages.auth.signInCta}
      takeFocus
    />
  );
}
