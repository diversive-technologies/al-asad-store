import {
  orderAccessTokenSchema,
  orderNumberSchema,
  type OrderAccessToken,
  type OrderNumber,
} from '@/lib/domain/ids';

/**
 * MOD-04 — the orders this browser may read back, as the value of one httpOnly
 * cookie. Pure: the cookie itself is `api/order-access-cookie.ts`.
 *
 * Each entry pairs an order number with the token the backend issued for it, at
 * placement or after its mobile number was proved. The TOKEN is the capability —
 * the number beside it only says which order to present it for, and a browser
 * that writes a number of its own into the cookie gains nothing without the token
 * the backend minted.
 */
export interface OrderGrant {
  readonly orderNumber: OrderNumber;
  readonly token: OrderAccessToken;
}

/**
 * How many orders one browser remembers, newest first. Bounded so the cookie
 * stays well inside a browser's 4 KB limit; an older order is still found again
 * by its mobile number.
 */
export const MAX_REMEMBERED_ORDERS = 10;

/* Neither character appears in an order number or a token, and neither needs
   escaping in a cookie value. */
const PAIR = '.';
const ENTRY = '~';

/**
 * SEC-02 — the cookie is untrusted input. Every entry is parsed back into the ids
 * it claims to hold, and an entry that does not parse is dropped rather than
 * trusted; a cookie that is absent or unreadable holds nothing.
 */
export function parseOrderGrants(raw: string | undefined): OrderGrant[] {
  if (raw === undefined || raw.length === 0) return [];

  return raw
    .split(ENTRY)
    .slice(0, MAX_REMEMBERED_ORDERS)
    .flatMap((entry) => {
      const [number, token, ...rest] = entry.split(PAIR);
      const orderNumber = orderNumberSchema.safeParse(number);
      const parsedToken = orderAccessTokenSchema.safeParse(token);
      return rest.length === 0 && orderNumber.success && parsedToken.success
        ? [{ orderNumber: orderNumber.data, token: parsedToken.data }]
        : [];
    });
}

export function serialiseOrderGrants(grants: readonly OrderGrant[]): string {
  return grants.map((grant) => `${grant.orderNumber}${PAIR}${grant.token}`).join(ENTRY);
}

/**
 * The list with this grant first. A newer token for the same order replaces the
 * older one, and the oldest order falls off the end past the bound.
 */
export function withOrderGrant(grants: readonly OrderGrant[], grant: OrderGrant): OrderGrant[] {
  const others = grants.filter((entry) => entry.orderNumber !== grant.orderNumber);
  return [grant, ...others].slice(0, MAX_REMEMBERED_ORDERS);
}

/** The token this browser holds for one order, or `null`. */
export function tokenFor(
  grants: readonly OrderGrant[],
  orderNumber: OrderNumber,
): OrderAccessToken | null {
  return grants.find((grant) => grant.orderNumber === orderNumber)?.token ?? null;
}
