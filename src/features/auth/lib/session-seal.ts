import { createHmac, timingSafeEqual } from 'node:crypto';

import { sessionSchema, type Session } from '../schemas/auth.schema';

/**
 * F-01 — signing the session cookie (plan TD-2).
 *
 * The cookie used to be the session as plain JSON, so anyone could write one and
 * become any customer. It is now `v1.<payload>.<signature>`: the payload is the
 * session and its lifetime, the signature is an HMAC-SHA256 over everything
 * before it, made with a secret only this server holds.
 *
 * This file is the pure half — it takes the secrets as arguments and reads no
 * environment, so the end-to-end suite can seal a cookie with the same code and
 * the suite's own secret (it cannot import a `server-only` module). The
 * environment-bound half is `session-token.ts`.
 *
 * No function here throws: a token that fails any check is `null` (ERR-05(2)),
 * and the reader treats `null` as signed out.
 */

const VERSION = 'v1';

/** Seven days, as the cookie's own `maxAge` — the signed expiry is the real one. */
export const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 7;

/**
 * A sealed session is a few hundred bytes. Anything near a browser's cookie
 * ceiling is not one, and is refused before it is decoded or hashed (SEC-02).
 */
const MAX_TOKEN_LENGTH = 2048;

function sign(signedPart: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(signedPart).digest();
}

/** `v1.<payload>.<signature>` for `session`, valid for seven days from `nowSeconds`. */
export function sealSessionWith(session: Session, nowSeconds: number, secret: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      s: session,
      iat: nowSeconds,
      exp: nowSeconds + SESSION_LIFETIME_SECONDS,
    }),
  ).toString('base64url');
  const signedPart = `${VERSION}.${payload}`;
  return `${signedPart}.${sign(signedPart, secret).toString('base64url')}`;
}

function signatureMatches(signedPart: string, given: string, secret: string): boolean {
  const expected = sign(signedPart, secret);
  const actual = Buffer.from(given, 'base64url');
  // timingSafeEqual throws on unequal lengths, so the length is compared first.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function payloadOf(encoded: string): unknown {
  // ERR-05(1): JSON.parse signals malformed input only by throwing.
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The session a token carries, or `null`.
 *
 * `secrets` is the current secret first, then the previous one during a
 * rotation: a token signed with either opens, and only the current one ever
 * signs. The expiry is inside the signed payload, so the cookie's `maxAge`
 * cannot be used to keep a session alive past it.
 */
export function openSessionWith(
  token: string,
  nowSeconds: number,
  secrets: readonly string[],
): Session | null {
  if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) return null;

  const parts = token.split('.');
  const [version, encoded, given] = parts;
  if (parts.length !== 3 || version !== VERSION) return null;
  if (encoded === undefined || given === undefined) return null;

  const signedPart = `${VERSION}.${encoded}`;
  // `some`, not an early return per secret: both are always tried, so how long
  // this takes does not say which secret matched.
  const genuine = secrets.map((secret) => signatureMatches(signedPart, given, secret));
  if (!genuine.some(Boolean)) return null;

  const payload = payloadOf(encoded);
  if (!isRecord(payload)) return null;
  const { exp, s } = payload;
  if (typeof exp !== 'number' || !Number.isFinite(exp) || exp <= nowSeconds) return null;

  const parsed = sessionSchema.safeParse(s);
  return parsed.success ? parsed.data : null;
}
