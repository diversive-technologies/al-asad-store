import { describe, expect, it } from 'vitest';

import { settledSignOutPhase, type SignOutPhase } from './sign-out-phase';

/**
 * F10 — "Sign out" swaps the whole account control, so focus fell to the page
 * and nothing was said. The header now lands focus and announces once the
 * session catches up — and only for a sign-out it started.
 */
describe('a sign-out from the header menu', () => {
  it.each<[string, SignOutPhase, boolean, SignOutPhase]>([
    ['waits while the session still says signed in', 'SIGNING_OUT', true, 'SIGNING_OUT'],
    ['lands once the session says signed out', 'SIGNING_OUT', false, 'SIGNED_OUT'],
    ['stays landed while the customer stays signed out', 'SIGNED_OUT', false, 'SIGNED_OUT'],
    ['is spent once the customer signs in again', 'SIGNED_OUT', true, 'IDLE'],
    ['never claims a sign-out it did not start', 'IDLE', false, 'IDLE'],
  ])('%s', (_label, phase, isSignedIn, expected) => {
    expect(settledSignOutPhase(phase, isSignedIn)).toBe(expected);
  });
});
