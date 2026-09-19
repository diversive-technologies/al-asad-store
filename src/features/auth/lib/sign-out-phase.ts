/**
 * Where a sign-out started from the header's menu has got to.
 *
 * `SIGNING_OUT` — the cookie is gone and the page is being asked again, so the
 * session this render holds may still say signed in. `SIGNED_OUT` — the session
 * now agrees, and the header is to say so and take focus (A11Y-05).
 */
export type SignOutPhase = 'IDLE' | 'SIGNING_OUT' | 'SIGNED_OUT';

/**
 * The phase a render should be in, given what the session says now.
 *
 * MOD-04 — pure. It moves on only when the session catches up, and is spent the
 * moment the customer is signed in again, so a LATER session that ends some
 * other way is never announced as this sign-out, nor pulls focus.
 */
export function settledSignOutPhase(phase: SignOutPhase, isSignedIn: boolean): SignOutPhase {
  if (phase === 'SIGNING_OUT' && !isSignedIn) return 'SIGNED_OUT';
  if (phase === 'SIGNED_OUT' && isSignedIn) return 'IDLE';
  return phase;
}
