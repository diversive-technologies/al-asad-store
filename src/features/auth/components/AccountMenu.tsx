'use client';

import { useId, useRef } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';
import { returnPathFrom } from '@/lib/utils/return-path';
import { User } from '@/lib/vendor/icons';

import { useSignOutLanding } from '../hooks/use-sign-out-landing';
import { AccountMenuPanel } from './AccountMenuPanel';
import { useSession } from './SessionProvider';

export interface AccountMenuProps {
  messages: Messages;
}

/** The bar's icon-control geometry, shared by the signed-out link and the menu button. */
const ICON_CONTROL =
  'focus-visible:ring-brand-500 rounded-full p-2 transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:outline-none';

/**
 * Who you are, and the way out — as an icon, like everything else in the bar.
 *
 * A name and a "Sign out" word sat oddly beside a row of icons, and the name in
 * particular took a fixed muted colour that did not follow the header when it
 * turns transparent over the hero. One glyph, and the details behind it.
 *
 * Signed out, the glyph is a link to sign-in that REMEMBERS THIS PAGE, so signing
 * in returns the customer here rather than to the homepage. The page is read back
 * through `returnPathFrom` (SEC-06); the homepage needs no reminder.
 *
 * Signed in, it opens `AccountMenuPanel`. The panel is KEYED on the path: this
 * menu lives in the root layout, which survives a client-side navigation, and so
 * does an open popover — a new key replaces the element, which is how a popover
 * closes anyway (the same fix `SortControl` carries).
 *
 * Signing out from the panel lands focus on the sign-in link that replaces it and
 * says so in a status line kept mounted in BOTH states, so its words are announced
 * when they arrive (`useSignOutLanding`).
 *
 * No colour is pinned anywhere here — everything inherits from the header, so
 * both the transparent-over-film and solid states stay legible.
 */
export function AccountMenu({ messages }: AccountMenuProps) {
  const t = messages.auth;
  const pathname = usePathname();
  const session = useSession();
  // Generated, so two instances could never collide on the id.
  const id = useId();
  const signInLink = useRef<HTMLAnchorElement>(null);
  const landing = useSignOutLanding(session.isSignedIn, signInLink);
  const returnTo = returnPathFrom(pathname);

  return (
    <>
      {session.isSignedIn ? (
        <>
          <button
            type="button"
            popoverTarget={id}
            aria-label={t.accountMenuLabel}
            className={ICON_CONTROL}
          >
            <User className="h-5 w-5" aria-hidden />
          </button>
          <AccountMenuPanel
            key={pathname}
            id={id}
            session={session}
            messages={messages}
            onSignedOut={landing.signingOut}
          />
        </>
      ) : (
        <Link
          ref={signInLink}
          href={ROUTES.signInFrom(returnTo === ROUTES.home ? null : returnTo)}
          // A11Y-04: an icon-only control still has to say what it is.
          aria-label={t.signInCta}
          className={ICON_CONTROL}
        >
          <User className="h-5 w-5" aria-hidden />
        </Link>
      )}
      <span role="status" className="sr-only">
        {landing.hasSignedOut ? t.signedOutStatus : null}
      </span>
    </>
  );
}
