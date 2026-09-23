import { clientKey } from '@/config/client';
import { clientEnv } from '@/config/env.client';

/**
 * SSOT-00 — every cookie this store sets is named here, once.
 *
 * `cart` was named inside `features/bag` while it was the only one. The mock
 * layer's session cookie (D1, serverless) has to snapshot the cart the id
 * names, so the name is now read from two places and belongs in neither of
 * them. D5: both carry the client's key prefix rather than a brand.
 */
export const CART_COOKIE_NAME = clientKey('cart');

/**
 * D1 — where one visitor's mock rows ride between serverless invocations.
 *
 * Chunked: a cookie value is capped near 4KB by every browser, and a placed
 * order with a measurement snapshot can exceed that on its own. The suffix is
 * the chunk index, so `…session.0`, `…session.1`.
 */
export const MOCK_SESSION_COOKIE_NAME = clientKey('session');

/** §34 — the guest's measurement device token. Its profiles are keyed on it. */
export const DEVICE_COOKIE_NAME = clientKey('measurements');

/**
 * SEC-01 — the options every CAPABILITY cookie carries: the cart id, a
 * measurements device token — anything whose holder holds what it names.
 *
 * httpOnly, so no client script ever reads it. `SameSite=Lax` rather than
 * `Strict`, so a customer following a link back into the store from WhatsApp
 * still has it. Secure wherever the store runs on HTTPS; local development is
 * plain HTTP.
 */
export function capabilityCookieOptions(maxAgeSeconds: number): {
  readonly httpOnly: true;
  readonly sameSite: 'lax';
  readonly path: '/';
  readonly secure: boolean;
  readonly maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: clientEnv.NEXT_PUBLIC_APP_URL.startsWith('https://'),
    maxAge: maxAgeSeconds,
  };
}
