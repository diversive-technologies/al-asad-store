'use client';

import { useRef } from 'react';

import Link from 'next/link';

import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';
import { Heart, User } from '@/lib/vendor/icons';

import { SignOutButton } from './SignOutButton';

export interface AccountMenuPanelProps {
  /** The id the menu button's `popoverTarget` names. */
  id: string;
  session: { readonly displayName: string; readonly email: string; readonly mobile: string };
  messages: Messages;
  /** The sign-out has succeeded; called before the page is asked again. */
  onSignedOut: () => void;
}

const MENU_ITEM =
  'border-border text-fg hover:bg-surface-muted focus-visible:ring-brand-500 rounded-card flex w-full items-center justify-center gap-2 border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none';

/**
 * The signed-in customer's menu: who they are, their account, their saved items,
 * and the way out.
 *
 * Built on the native popover API for the same reason `InfoPopover` is: the
 * platform gives the top layer, light-dismiss, `Escape` and focus return, and
 * `popoverTarget` wires the button to the panel with no JavaScript, so it works
 * before hydration (A11Y-08, BASE-01).
 *
 * CHOOSING A LINK CLOSES THE MENU. A click inside an `auto` popover is not a light
 * dismiss, and the panel lives in the root layout, so "Your account" used to
 * navigate with the menu still open over the page it had just opened.
 * `hidePopover` closes it as the link is followed — including a link to the page
 * already showing, which the parent's key on the path cannot see.
 */
export function AccountMenuPanel({ id, session, messages, onSignedOut }: AccountMenuPanelProps) {
  const panel = useRef<HTMLDivElement>(null);

  const close = (): void => {
    panel.current?.hidePopover();
  };

  return (
    <div
      ref={panel}
      id={id}
      popover="auto"
      aria-labelledby={`${id}-name`}
      className="account-popover popover-animated"
    >
      <p id={`${id}-name`} className="text-fg text-sm font-medium">
        {session.displayName}
      </p>

      {/* Only what the account actually holds. An empty line for a customer
          who signed in by code would be a field pretending to be data. */}
      {session.email.length === 0 ? null : (
        <p className="text-fg-muted mt-0.5 text-xs">
          <bdi>{session.email}</bdi>
        </p>
      )}
      {/* I18N-04 — a number is a left-to-right token in any paragraph; in an Urdu
          one, a number stored as typed ("0300 1234567") read as "1234567 0300". */}
      {session.mobile.length === 0 ? null : (
        <p className="text-fg-muted text-xs">
          <bdi dir="ltr">{session.mobile}</bdi>
        </p>
      )}

      {/* The account area: the only way in from the bar. A guest has no menu, so
          theirs is reached from the studio's own confirmation instead. */}
      <Link href={ROUTES.account} onClick={close} className={cn(MENU_ITEM, 'mt-3')}>
        <User className="h-4 w-4" aria-hidden />
        {messages.account.navLabel}
      </Link>

      {/* The saved items are the customer's, and the heart that fills them is
          hidden from guests for the same reason; this is the only way to the page.
          I18N-05: a heart is not directional, so it must not mirror. */}
      <Link href={ROUTES.wishlist} onClick={close} className={cn(MENU_ITEM, 'mt-2')}>
        <Heart className="h-4 w-4" aria-hidden />
        {messages.wishlist.navLabel}
      </Link>

      <SignOutButton
        messages={messages}
        className={cn(MENU_ITEM, 'mt-2')}
        onSignedOut={onSignedOut}
      />
    </div>
  );
}
