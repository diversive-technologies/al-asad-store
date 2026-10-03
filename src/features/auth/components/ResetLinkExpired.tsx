'use client';

import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';

import { ResetNotice } from './ResetNotice';

export interface ResetLinkExpiredProps {
  readonly messages: Messages;
  /** True when it replaces the form after a press; false when it is the page as it loaded. */
  readonly takeFocus: boolean;
}

/**
 * F-03 — a reset link that cannot be used: unknown, already used, past its hour,
 * or not a link we issued at all. One sentence for every one of those, because
 * which it was is nothing the visitor can act on and everything an attacker would
 * like to know; the way on is the same — ask for another.
 */
export function ResetLinkExpired({ messages, takeFocus }: ResetLinkExpiredProps) {
  return (
    <ResetNotice
      message={messages.auth.resetLinkExpired}
      linkHref={ROUTES.forgotPassword}
      linkLabel={messages.auth.resetLinkExpiredCta}
      takeFocus={takeFocus}
    />
  );
}
