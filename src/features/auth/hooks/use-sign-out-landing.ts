'use client';

import { useEffect, useState, type RefObject } from 'react';

import { settledSignOutPhase, type SignOutPhase } from '../lib/sign-out-phase';

export interface SignOutLanding {
  /** The menu's own sign-out has landed: say so, beside the control that replaced it. */
  readonly hasSignedOut: boolean;
  /** Called by the menu once the sign-out action has succeeded, before the page is asked again. */
  readonly signingOut: () => void;
}

/**
 * Where focus goes after "Sign out" (A11Y-05, WCAG 2.4.3).
 *
 * Signing out swaps the whole account control: the menu button and its open panel
 * — the pressed "Sign out" included — give way to the sign-in link, and the browser
 * drops focus to `<body>` with nothing said. Once the session catches up, focus is
 * put on that link, which is also where somebody signing straight back in would go.
 * The phase is `settledSignOutPhase`, adjusted while rendering as `RememberSizeOffer`
 * does, so no effect writes state; the effect only moves focus.
 */
export function useSignOutLanding(
  isSignedIn: boolean,
  signInLink: RefObject<HTMLAnchorElement | null>,
): SignOutLanding {
  const [phase, setPhase] = useState<SignOutPhase>('IDLE');
  const settled = settledSignOutPhase(phase, isSignedIn);
  if (settled !== phase) setPhase(settled);

  const hasSignedOut = settled === 'SIGNED_OUT';

  // DOM focus is the external system (STATE-04): once, when the sign-out lands.
  useEffect(() => {
    if (hasSignedOut) signInLink.current?.focus();
  }, [hasSignedOut, signInLink]);

  return {
    hasSignedOut,
    signingOut: () => {
      setPhase('SIGNING_OUT');
    },
  };
}
