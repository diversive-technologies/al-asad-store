'use client';

import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';

import { ResetNotice } from './ResetNotice';

export interface PasswordResetSentProps {
  readonly messages: Messages;
}

/**
 * What the reset form becomes once the request has been accepted. One sentence
 * whatever the backend found, for the reason `PasswordResetForm` gives. It
 * replaces the form, so it takes focus (`ResetNotice` has the reasoning).
 */
export function PasswordResetSent({ messages }: PasswordResetSentProps) {
  return (
    <ResetNotice
      message={messages.auth.resetSent}
      linkHref={ROUTES.signIn}
      linkLabel={messages.auth.backToSignIn}
      takeFocus
    />
  );
}
