'use client';

import { useId } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';
import { LogOut, User } from '@/lib/vendor/icons';

import { signOutAction } from '../actions';
import { useSession } from './SessionProvider';

/**
 * Who you are, and the way out — as an icon, like everything else in the bar.
 *
 * A name and a "Sign out" word sat oddly beside a row of icons, and the name in
 * particular took a fixed muted colour that did not follow the header when it
 * turns transparent over the hero. One glyph, and the details behind it.
 *
 * Built on the native popover API for the same reason `InfoPopover` is: the
 * platform gives the top layer, light-dismiss, `Escape` and focus return, and
 * `popoverTarget` wires the button to the panel with no JavaScript, so it works
 * before hydration (A11Y-08, BASE-01).
 *
 * No colour is pinned anywhere here — everything inherits from the header, so
 * both the transparent-over-film and solid states stay legible.
 */
export function AccountMenu({ messages }: { messages: Messages }) {
  const t = messages.auth;
  const router = useRouter();
  const { isSignedIn, displayName, email, mobile } = useSession();
  // CMP-11: generated, so two instances could never collide on the id.
  const id = useId();

  if (!isSignedIn) {
    return (
      <Link
        href={ROUTES.signIn}
        // A11Y-04: an icon-only control still has to say what it is.
        aria-label={t.signInCta}
        className="focus-visible:ring-brand-500 rounded-full p-2 transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:outline-none"
      >
        <User className="h-5 w-5" aria-hidden />
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label={t.accountMenuLabel}
        className="focus-visible:ring-brand-500 rounded-full p-2 transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:outline-none"
      >
        <User className="h-5 w-5" aria-hidden />
      </button>

      <div id={id} popover="auto" aria-labelledby={`${id}-name`} className="account-popover">
        <p id={`${id}-name`} className="text-fg text-sm font-medium">
          {displayName}
        </p>

        {/* Only what the account actually holds. An empty line for a customer
            who signed in by code would be a field pretending to be data. */}
        {email.length === 0 ? null : <p className="text-fg-muted mt-0.5 text-xs">{email}</p>}
        {mobile.length === 0 ? null : <p className="text-fg-muted text-xs">{mobile}</p>}

        <button
          type="button"
          onClick={() => {
            void signOutAction().then(() => {
              // The cookie is gone; the server has to be asked again.
              router.refresh();
            });
          }}
          className="border-border text-fg hover:bg-surface-muted focus-visible:ring-brand-500 mt-3 flex w-full items-center justify-center gap-2 rounded-card border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          <LogOut className="h-4 w-4 rtl:rotate-180" aria-hidden />
          {t.signOut}
        </button>
      </div>
    </>
  );
}
