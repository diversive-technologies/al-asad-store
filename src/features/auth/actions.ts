'use server';

import { cookies } from 'next/headers';

import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/errors';
import { err, ok, type Result } from '@/lib/result';

import {
  codeIssuedSchema,
  codeRequestSchema,
  codeSignInSchema,
  passwordResetSchema,
  passwordSignInSchema,
  sessionSchema,
  signUpSchema,
  type Session,
} from './schemas/auth.schema';

/**
 * Architecture §11 Identity and Access, as Server Actions.
 *
 * D3: still the placeholder — the Java module is what will actually hold
 * accounts, hash passwords and rate-limit attempts. What is real here is the
 * SHAPE: every call below is the §11 operation it is named after, so replacing
 * the mock is a base-URL change and nothing above this file moves.
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

const SESSION_COOKIE = 'session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/** The one shape every failure in this file collapses to (ERR-03). */
function invalid(field: string, message: string): ApiError {
  return { kind: 'VALIDATION', message, fieldErrors: { [field]: [message] } };
}

async function storeSession(session: Session): Promise<void> {
  const store = await cookies(); // NEXT-04: cookies() is async.

  /*
   * The value is the display name and nothing else. It is not a token and
   * cannot be exchanged for one; when §11 lands this becomes an opaque session
   * id issued by Java, and the cookie options below are already what that
   * needs.
   */
  store.set(SESSION_COOKIE, JSON.stringify(session), {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
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
    next: { revalidate: 0 },
  });

  if (!result.ok) return result;

  await storeSession(result.value);
  return result;
}

/**
 * §11 `issueCode(mobile) -> void`.
 *
 * Resolves to the mock's `devCode` when there is one. The real §11 returns
 * nothing and sends an SMS; this exists because no SMS provider is wired up and
 * the path would otherwise be unreachable. The caller treats it as optional.
 */
export async function requestCodeAction(input: unknown): Promise<Result<string | null, ApiError>> {
  const parsed = codeRequestSchema.safeParse(input);
  if (!parsed.success) return err(invalid('mobile', 'Enter a valid mobile number.'));

  const result = await apiRequest({
    path: ENDPOINTS.auth.issueCode,
    schema: codeIssuedSchema,
    method: 'POST',
    body: parsed.data,
    next: { revalidate: 0 },
  });

  if (!result.ok) return result;
  return ok(result.value.devCode ?? null);
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
 * Always resolves ok, whatever the backend said. §11: "authentication responses
 * never reveal whether an account exists", and a reset form that failed
 * differently for an unknown address would answer exactly that question.
 */
export async function requestPasswordResetAction(input: unknown): Promise<Result<null, ApiError>> {
  const parsed = passwordResetSchema.safeParse(input);
  if (!parsed.success) return err(invalid('email', 'Enter a valid email address.'));

  await apiRequest({
    path: ENDPOINTS.auth.resetPassword,
    schema: sessionSchema.nullable(),
    method: 'POST',
    body: parsed.data,
    next: { revalidate: 0 },
  });

  return ok(null);
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

  // ERR-05(2): a cookie from an older shape is recoverable — treat it as signed
  // out rather than letting a parse error take down every page.
  try {
    const parsed = sessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
