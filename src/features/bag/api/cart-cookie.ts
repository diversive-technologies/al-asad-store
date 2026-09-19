import 'server-only';

import { cookies } from 'next/headers';

import { clientKey } from '@/config/client';
import type { ApiError } from '@/lib/api/errors';
import { ok, type Result } from '@/lib/result';
import { cartIdSchema, type CartId } from '@/lib/domain/ids';
import { capabilityCookieOptions } from '@/lib/utils/cookies';

import { createCart } from './bag-server';

/**
 * Where the cart id lives, and why it lives there.
 *
 * SEC-01 — the cart id is a CAPABILITY: whoever holds it holds that bag, its
 * reservations and eventually its checkout. So it is `httpOnly` and never
 * reaches client JavaScript. Nothing in `features/bag/components` knows the id
 * exists; the BFF attaches it on the way past, which is exactly what DATA-08
 * says a BFF is for.
 *
 * `sameSite: 'lax'` rather than `'strict'`: a customer following a link back
 * into the store from WhatsApp or an email must still have their bag, and a
 * bag id is not an authentication token. §28.2's guest checkout means this
 * cookie is the ONLY thing tying an anonymous customer to their reservations.
 *
 * D5: the name carries the client's key prefix rather than a brand written here.
 */
const COOKIE_NAME = clientKey('cart');

/** Long enough to survive a browsing session and a night's sleep. The holds
 *  inside it expire on their own schedule (§7.1), which is the real limit. */
const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * The stored id, or `null` when this browser has no bag this side can name.
 *
 * SEC-02: a cookie is untrusted input, so it is PARSED as the id the backend
 * issued rather than cast to one — it goes into a backend path. A value that is
 * not shaped like a cart id is treated as no cookie at all: the next add takes a
 * fresh cart and overwrites it. Whether a well-shaped id names a REAL cart is
 * still the backend's answer alone (SEC-03).
 */
export async function readCartId(): Promise<CartId | null> {
  const store = await cookies();
  const parsed = cartIdSchema.safeParse(store.get(COOKIE_NAME)?.value);
  return parsed.success ? parsed.data : null;
}

async function writeCartId(cartId: CartId): Promise<void> {
  const store = await cookies();

  store.set(COOKIE_NAME, cartId, capabilityCookieOptions(COOKIE_MAX_AGE_SECONDS));
}

export async function clearCartId(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * The cart this browser should be writing to, creating one if it has none.
 *
 * Called only on WRITE paths. A visitor who never adds anything never gets a
 * cookie and never causes a cart row — reads use `readCartId` and answer with
 * an empty bag when there is nothing there.
 */
export async function ensureCartId(): Promise<Result<CartId, ApiError>> {
  const existing = await readCartId();
  if (existing !== null) return ok(existing);

  const created = await createCart();
  if (!created.ok) return created;

  await writeCartId(created.value.id);
  return ok(created.value.id);
}
