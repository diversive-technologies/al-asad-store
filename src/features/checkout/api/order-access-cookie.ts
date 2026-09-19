import 'server-only';

import { cookies } from 'next/headers';

import { clientKey } from '@/config/client';
import type { OrderAccessToken, OrderNumber } from '@/lib/domain/ids';
import { capabilityCookieOptions } from '@/lib/utils/cookies';

import {
  parseOrderGrants,
  serialiseOrderGrants,
  tokenFor,
  withOrderGrant,
} from '../lib/order-grants';

/**
 * Where a browser keeps its tokens for reading orders back (§28.3).
 *
 * SEC-01 / SEC-05 — each token is a CAPABILITY: whoever holds it can read one
 * order's name, address and measurements. So the cookie is httpOnly with the
 * cart's options, and nothing in the browser ever sees a token.
 *
 * D5: the name carries the client's key prefix rather than a brand written here,
 * as the cart's does — two stores developed on one host share a cookie jar.
 */
const COOKIE_NAME = clientKey('orders');

/**
 * A week: long enough to come back to the confirmation in the days after buying,
 * short enough that a shared browser does not keep someone's delivery address
 * readable for a month. After it, the order's mobile number opens it again.
 */
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/** The token this browser holds for one order, or `null`. */
export async function accessTokenFor(orderNumber: OrderNumber): Promise<OrderAccessToken | null> {
  const store = await cookies();
  return tokenFor(parseOrderGrants(store.get(COOKIE_NAME)?.value), orderNumber);
}

/**
 * Keeps a token the backend issued, newest first, within the bound — under every
 * address it opened the order at, in one write.
 */
export async function rememberOrderAccess(
  orderNumbers: readonly OrderNumber[],
  token: OrderAccessToken,
): Promise<void> {
  const store = await cookies();
  const grants = orderNumbers.reduce(
    (kept, orderNumber) => withOrderGrant(kept, { orderNumber, token }),
    parseOrderGrants(store.get(COOKIE_NAME)?.value),
  );

  store.set(
    COOKIE_NAME,
    serialiseOrderGrants(grants),
    capabilityCookieOptions(COOKIE_MAX_AGE_SECONDS),
  );
}
