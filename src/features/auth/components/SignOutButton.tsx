'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import type { Messages } from '@/i18n/messages/en';
import { LogOut } from '@/lib/vendor/icons';

import { signOutAction } from '../actions';

export interface SignOutButtonProps {
  messages: Messages;
  /** The menu item's own look, which the panel owns. */
  className: string;
  /** The sign-out has succeeded; called before the page is asked again. */
  onSignedOut: () => void;
}

/**
 * "Sign out", and what became of it.
 *
 * Success hands over to the header (`useSignOutLanding`), which is what is left
 * once this button and its menu are gone. A sign-out that did NOT happen is said
 * here, in the menu still open (A11Y-05): the action's rejection used to be
 * swallowed, leaving the customer signed in with nothing said.
 */
export function SignOutButton({ messages, className, onSignedOut }: SignOutButtonProps) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setFailed(false);
          void signOutAction().then(
            () => {
              // The cookie is gone; the server has to be asked again.
              onSignedOut();
              router.refresh();
            },
            () => {
              setFailed(true);
            },
          );
        }}
        className={className}
      >
        <LogOut className="h-4 w-4 rtl:rotate-180" aria-hidden />
        {messages.auth.signOut}
      </button>
      <p role="alert" className="text-fg mt-2 text-xs empty:hidden">
        {failed ? messages.auth.signOutFailed : null}
      </p>
    </>
  );
}
