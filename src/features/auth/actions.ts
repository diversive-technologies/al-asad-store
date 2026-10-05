'use server';

import { cookies } from 'next/headers';

import { apiRequest } from '@/lib/api/client';
import { currentClientAddressHeader } from '@/lib/api/client-address';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import { err, ok, type Result } from '@/lib/result';

import { authFailureOf } from './lib/auth-failure';
import { SESSION_COOKIE } from './lib/session-cookie';
import { SESSION_LIFETIME_SECONDS } from './lib/session-seal';
import { openSession, sealSession } from './lib/session-token';
import {
  codeIssuedSchema,
  codeRequestSchema,
  codeSignInSchema,
  passwordResetConfirmSchema,
  passwordResetSchema,
  passwordSignInSchema,
  sessionSchema,
  signUpSchema,
  voidReplySchema,
  type Session,
} from './schemas/auth.schema';

/**
 * Architecture §11 Identity and Access, as Server Actions.
 *
 * The Java module holds accounts, hashes passwords and rate-limits attempts.
 * Every call below is the §11 operation it is named after; D3 survives only in
 * the session cookie, which this file writes from what Java answers.
 *
 * SEC-01, and it governs every function here: a password crosses this boundary
 * once, in a POST body, and is never stored, echoed, logged or written to a
 * URL. The session cookie that results is httpOnly and holds a display name —
 * it confers no authority, because SEC-03 has the backend re-check on every
 * request.
 *
 * NEXT-12 / SEC-02: Server Action input is untrusted and validated with Zod
 * before it goes anywhere, exactly as a route handler's would be.
 */

/** The one shape every failure in this file collapses to (ERR-03). */
function invalid(field: string, message: string): ApiError {
  return { kind: 'VALIDATION', message, fieldErrors: { [field]: [message] } };
}

async function storeSession(session: Session): Promise<void> {
  const store = await cookies(); // NEXT-04: cookies() is async.

  /*
   * F-01: the value is the session SEALED — signed with this server's secret and
   * carrying its own expiry — so a browser cannot write one, alter one or keep
   * one alive past its seven days. It is still a storefront cookie rather than a
   * session Java issues (X-09); the cookie options below are what that needs.
   */
  store.set(SESSION_COOKIE, sealSession(session, new Date()), {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_LIFETIME_SECONDS,
  });
}

/** §11 `authenticate(email, password) -> Session`. */
export async function signInWithPasswordAction(input: unknown): Promise<Result<Session, ApiError>> {
  const parsed = passwordSignInSchema.safeParse(input);
  if (!parsed.success) return err(invalid('email', 'Enter your email and password.'));

  const result = await apiRequest({
    path: ENDPOINTS.auth.authenticate,
    schema: sessionSchema,
    method: 'POST',
    body: parsed.data,
    // F-02: Java rate-limits by the customer's address (A-03).
    headers: await currentClientAddressHeader(),
    next: { revalidate: 0 },
  });

  if (!result.ok) return result;

  await storeSession(result.value);
  return result;
}

/**
 * §11 `issueCode(mobile) -> void`.
 *
 * Resolves to the backend's `devCode` when it hands one back, which it does only
 * while its demo sign-in codes are switched on. Otherwise it returns nothing and
 * sends the code itself; the caller treats it as optional.
 */
export async function requestCodeAction(input: unknown): Promise<Result<string | null, ApiError>> {
  const parsed = codeRequestSchema.safeParse(input);
  if (!parsed.success) return err(invalid('mobile', 'Enter a valid mobile number.'));

  const result = await apiRequest({
    path: ENDPOINTS.auth.issueCode,
    schema: codeIssuedSchema,
    method: 'POST',
    body: parsed.data,
    // F-02: Java rate-limits by the customer's address (A-03).
    headers: await currentClientAddressHeader(),
    next: { revalidate: 0 },
  });

  if (!result.ok) return result;
  return ok(result.value?.devCode ?? null);
}

/** §11 `authenticateByCode(mobile, code) -> Session`. */
export async function signInWithCodeAction(input: unknown): Promise<Result<Session, ApiError>> {
  const parsed = codeSignInSchema.safeParse(input);
  if (!parsed.success) return err(invalid('code', 'Enter the six-digit code.'));

  const result = await apiRequest({
    path: ENDPOINTS.auth.authenticateByCode,
    schema: sessionSchema,
    method: 'POST',
    body: parsed.data,
    // F-02: Java rate-limits by the customer's address (A-03).
    headers: await currentClientAddressHeader(),
    next: { revalidate: 0 },
  });

  if (!result.ok) return result;

  await storeSession(result.value);
  return result;
}

/** Registration. §11 owns accounts; this is the call that creates one. */
export async function signUpAction(input: unknown): Promise<Result<Session, ApiError>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return err(invalid('email', 'Please check the details you entered.'));

  /*
   * The confirmation never leaves the browser. It exists to catch a typo, and
   * sending it would be transmitting the password a second time for no reason
   * (SEC-01).
   */
  const { confirmPassword: _ignored, ...account } = parsed.data;
  void _ignored;

  const result = await apiRequest({
    path: ENDPOINTS.auth.register,
    schema: sessionSchema,
    method: 'POST',
    body: account,
    // F-02: Java rate-limits by the customer's address (A-03).
    headers: await currentClientAddressHeader(),
    next: { revalidate: 0 },
  });

  if (!result.ok) return result;

  // Registering signs you in; being asked to authenticate again immediately is
  // a step with nothing behind it.
  await storeSession(result.value);
  return result;
}

/**
 * §11 `resetPassword(email) -> void`.
 *
 * Resolves ok whatever the backend ANSWERED. §11: "authentication responses never
 * reveal whether an account exists", and a reset form that failed differently for
 * an unknown address would answer exactly that question.
 *
 * Three failures are still returned, because none says anything about an
 * account: an address that is not an email at all (refused before it is sent),
 * a store that could not be reached — which used to be reported as "a reset
 * link is on its way" to somebody who was then left waiting for nothing — and
 * Java's limit per ADDRESS (F-09), which tells the caller to wait. The limit that
 * depends on the email answers like any other request, so it reveals nothing.
 */
export async function requestPasswordResetAction(input: unknown): Promise<Result<null, ApiError>> {
  const parsed = passwordResetSchema.safeParse(input);
  if (!parsed.success) return err(invalid('email', 'Enter a valid email address.'));

  const result = await apiRequest({
    path: ENDPOINTS.auth.resetPassword,
    schema: voidReplySchema,
    method: 'POST',
    body: parsed.data,
    // F-02: Java rate-limits by the customer's address (A-03).
    headers: await currentClientAddressHeader(),
    next: { revalidate: 0 },
  });

  // F-09: a store that cannot answer, and Java's per-address limit, are not answers about any account.
  if (!result.ok && ['UNREACHABLE', 'RATE_LIMITED'].includes(authFailureOf(result.error))) {
    return result;
  }
  return ok(null);
}

/**
 * F-03 — redeems the token from a reset email and sets the new password.
 *
 * The customer is NOT signed in by it: a link in an email is a weaker proof than
 * a password, and signing in from it would make an inbox a master key. They go
 * to the sign-in screen with the password they just chose.
 *
 * What the backend refuses with a 400 — an unknown, used or expired token — is
 * returned as the failure it is, and `resetConfirmOutcomeOf` says which words it
 * gets. The token and the password are the only secrets here and neither is
 * logged or echoed (SEC-01). The confirmation stays on this side of the wire.
 */
export async function confirmPasswordResetAction(input: unknown): Promise<Result<null, ApiError>> {
  const parsed = passwordResetConfirmSchema.safeParse(input);
  if (!parsed.success) return err(invalid('password', 'Please check the new password.'));

  const { token, password } = parsed.data;

  return apiRequest({
    path: ENDPOINTS.auth.confirmPasswordReset,
    schema: voidReplySchema,
    method: 'POST',
    body: { token, password },
    headers: await currentClientAddressHeader(),
    next: { revalidate: 0 },
  }).then((result) => (result.ok ? ok(null) : result));
}

/** Ends the session on this browser. §11's own invariant is server-side. */
export async function signOutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Whether this browser holds a session, for the interface to branch on.
 *
 * SEC-01: the cookie is httpOnly, so the client cannot read it and must be
 * TOLD. It confers no authority either way — the Java service re-checks
 * authorization on every request (SEC-03), and this only decides what is worth
 * offering someone on screen.
 */
export async function readSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (raw === undefined || raw.length === 0) return null;

  /*
   * ERR-05(2): anything that is not a genuine, unexpired, signed session — an
   * old unsigned cookie, a hand-written one, a tampered or expired token — is
   * signed out rather than an error that takes down every page. `openSession`
   * never throws.
   */
  return openSession(raw, new Date());
}
