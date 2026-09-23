import 'server-only';

import { gunzipSync, gzipSync } from 'node:zlib';

import { cookies } from 'next/headers';

import {
  CART_COOKIE_NAME,
  DEVICE_COOKIE_NAME,
  MOCK_SESSION_COOKIE_NAME,
  capabilityCookieOptions,
} from '@/lib/utils/cookies';

import {
  EMPTY_SESSION,
  isEmptySession,
  mockSessionSchema,
  type MockSession,
} from './session-snapshot';

/**
 * D1 — the visitor's mock rows, carried in their own cookie.
 *
 * `session-snapshot.ts` says WHY this exists; this file is only the codec and
 * the cookie I/O. It holds no opinion about what is in the session.
 *
 * ## Why gzip, and why chunks
 *
 * The payload is JSON with a lot of repeated keys, which is what gzip is best
 * at — a placed order compresses to roughly a third. Even so a browser caps a
 * single cookie near 4KB, and an order carrying a measurement snapshot can
 * pass that alone, so the encoded value is split across numbered cookies and
 * joined back in order. Chunks that are no longer needed are deleted, or a
 * shorter session would be read with a longer one's tail still attached.
 *
 * ## Why every failure is the empty session
 *
 * A cookie can arrive truncated, from an older shape of this code, or edited.
 * None of those is worth an error page in a storefront: the visitor loses a
 * bag they can rebuild in two clicks, which is strictly better than a 500.
 * `decode` therefore answers `null` for anything it cannot read, and the
 * caller starts fresh.
 */

/** Well inside the 4096-byte ceiling once the name and attributes are added. */
const CHUNK_SIZE = 3_500;

/** No visitor needs more than this; a cookie header past it is nonsense. */
const MAX_CHUNKS = 8;

/** Long enough to outlive a demonstration and a night's sleep. */
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function chunkName(index: number): string {
  return `${MOCK_SESSION_COOKIE_NAME}.${String(index)}`;
}

/**
 * ERR-05 — `gzipSync`, `JSON.parse` and base64 decoding all signal only by
 * throwing, so the boundary that converts them into a value is a try/catch.
 * It is not flow control: nothing downstream branches on which one failed.
 */
function decode(encoded: string): MockSession | null {
  try {
    const json = gunzipSync(Buffer.from(encoded, 'base64url')).toString('utf8');
    const parsed = mockSessionSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The encoded payload, or `null` when it could not be produced. */
function encode(session: MockSession): string | null {
  try {
    return gzipSync(Buffer.from(JSON.stringify(session), 'utf8')).toString('base64url');
  } catch {
    return null;
  }
}

type CookieStore = Awaited<ReturnType<typeof cookies>>;

/**
 * ERR-05 — the cookie store, or `null` outside a request scope.
 *
 * `cookies()` can reject OR throw synchronously depending on where it is
 * reached from, so both have to be caught here rather than with `.catch`.
 * Unit tests import the mock stores directly, with no request in flight.
 */
async function cookieStore(): Promise<CookieStore | null> {
  try {
    return await cookies();
  } catch {
    return null;
  }
}

/**
 * The visitor's stored rows, or the empty session.
 *
 * Reading cookies is legal in a Server Component render as well as a Route
 * Handler, which is what lets a cold instance restore the bag before
 * `/checkout` renders it. Outside a request scope `cookies()` throws — unit
 * tests import the mock layer directly — so that is a `null` store, not a
 * crash.
 */
export async function readMockSession(): Promise<MockSession> {
  const store = await cookieStore();
  if (store === null) return EMPTY_SESSION;

  let encoded = '';
  for (let index = 0; index < MAX_CHUNKS; index += 1) {
    const chunk = store.get(chunkName(index))?.value;
    if (chunk === undefined) break;
    encoded += chunk;
  }

  if (encoded.length === 0) return EMPTY_SESSION;
  return decode(encoded) ?? EMPTY_SESSION;
}

/**
 * One `Set-Cookie` value, with the attributes every capability cookie carries.
 *
 * SSOT: the attributes come from `capabilityCookieOptions` rather than being
 * spelled again here, so this cookie cannot drift from the cart id's.
 */
function serialise(name: string, value: string, maxAgeSeconds: number): string {
  const options = capabilityCookieOptions(maxAgeSeconds);
  const parts = [
    `${name}=${value}`,
    `Path=${options.path}`,
    `Max-Age=${String(options.maxAge)}`,
    `SameSite=${options.sameSite === 'lax' ? 'Lax' : options.sameSite}`,
  ];

  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');

  return parts.join('; ');
}

/**
 * The `Set-Cookie` values that record this session, ready to append.
 *
 * They are RETURNED rather than written through `cookies()`, because Next
 * drops a cookie set after the handler has produced its `Response` — the
 * mutation wrapper only knows what to record once the handler has answered,
 * which is precisely then. Verified against the running store: the session
 * cookie never appeared until the header was put on the response itself.
 *
 * A session with nothing in it, or one too big to carry, answers with expiry
 * for every chunk instead, so a stale cookie cannot outlive what it described.
 */
export function mockSessionCookies(session: MockSession): string[] {
  const encoded = isEmptySession(session) ? null : encode(session);

  if (encoded === null || encoded.length > CHUNK_SIZE * MAX_CHUNKS) {
    return expiredChunks(0);
  }

  const written: string[] = [];
  for (let start = 0; start < encoded.length; start += CHUNK_SIZE) {
    written.push(
      serialise(chunkName(written.length), encoded.slice(start, start + CHUNK_SIZE), MAX_AGE_SECONDS),
    );
  }

  // A shorter session than last time: expire the tail it no longer fills.
  return [...written, ...expiredChunks(written.length)];
}

/** `Set-Cookie` values that remove every chunk from `first` upwards. */
function expiredChunks(first: number): string[] {
  const expired: string[] = [];
  for (let index = first; index < MAX_CHUNKS; index += 1) {
    expired.push(serialise(chunkName(index), '', 0));
  }
  return expired;
}

/** The cart id this browser is holding, which scopes what gets snapshotted. */
export async function readCartIdForSession(): Promise<string | null> {
  const store = await cookieStore();
  return store?.get(CART_COOKIE_NAME)?.value ?? null;
}

/** §34 — the device token this browser holds, which scopes its measurements. */
export async function readDeviceTokenForSession(): Promise<string | null> {
  const store = await cookieStore();
  return store?.get(DEVICE_COOKIE_NAME)?.value ?? null;
}

/**
 * The cart id a handler has just minted, read back off its own response.
 *
 * The first add of a visit creates the cart DURING the request, so the id is
 * not in the request's cookies and `readCartIdForSession` cannot see it. It is
 * on the response, because that is how it reaches the browser.
 */
export function cartIdFromResponse(response: Response): string | null {
  return cookieFromResponse(response, CART_COOKIE_NAME);
}

/** The device token a handler has just remembered, for the same reason. */
export function deviceTokenFromResponse(response: Response): string | null {
  return cookieFromResponse(response, DEVICE_COOKIE_NAME);
}

function cookieFromResponse(response: Response, name: string): string | null {
  const match = response.headers
    .getSetCookie()
    .map((value) => new RegExp(`^${name}=([^;]+)`).exec(value))
    .find((found) => found !== null);

  return match?.[1] ?? null;
}
