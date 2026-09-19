import { canonicalOrderNumber, findOrder, type OrderPayload } from './orders-db';

/**
 * D1 — who may READ an order (§28.3), standing in for the Java rule.
 *
 * An order carries a name, a mobile number, a delivery address and, on a garment
 * being cut, the customer's measurements. Order numbers run in sequence, so a
 * number is an ADDRESS and never a secret: anyone can guess the next one. The
 * read is therefore served only to someone who can show more than the number:
 *
 * - the ACCOUNT that placed it, from the session the BFF attached;
 * - a browser holding an ACCESS TOKEN this module issued for that order — at
 *   placement, or after the order's mobile number was proved (§28.3's guest
 *   lookup "by number and mobile").
 *
 * Everyone else gets exactly what a number naming no order gets, so the read
 * cannot be used to learn which numbers exist.
 *
 * D6 — a grant is never withdrawn from the record. Every token issued stays on
 * file with how it was earned and when, so "who could read this order" is
 * answerable later.
 */

/** How a token was earned. */
type GrantRoute = 'PLACEMENT' | 'MOBILE';

interface OrderGrant {
  readonly token: string;
  readonly orderNumber: string;
  readonly route: GrantRoute;
  readonly grantedAt: number;
}

const GRANTS: OrderGrant[] = [];

/** What a reader presents. Either may be absent; neither is taken from a body. */
export interface OrderReader {
  readonly accountKey: string | null;
  readonly accessToken: string | null;
}

/**
 * Issues a fresh token for one order. The caller hands it to the BFF, never to a
 * page. Recorded against the order's own number, however it was spelt when asked.
 */
export function grantOrderAccess(orderNumber: string, route: GrantRoute): string {
  const token = crypto.randomUUID();
  GRANTS.push({
    token,
    orderNumber: canonicalOrderNumber(orderNumber),
    route,
    grantedAt: Date.now(),
  });
  return token;
}

function holdsGrant(order: OrderPayload, token: string | null): boolean {
  return (
    token !== null &&
    GRANTS.some((grant) => grant.token === token && grant.orderNumber === order.orderNumber)
  );
}

/**
 * The order, when this reader may see it; otherwise `null`, which is also the
 * answer for a number that names nothing.
 *
 * A guest's order carries no account, so no account key ever matches it — a
 * guest order is read with its token or found again by its mobile number.
 */
export function readableOrder(orderNumber: string, reader: OrderReader): OrderPayload | null {
  const order = findOrder(orderNumber);
  if (order === null) return null;

  const isOwner = order.accountKey !== null && order.accountKey === reader.accountKey;
  return isOwner || holdsGrant(order, reader.accessToken) ? order : null;
}

/* Digits only, so "0300-1234567" and "0300 1234567" are the same number. Which
   formats count as one number is this module's rule, never the page's. */
function digitsOf(mobile: string): string {
  return mobile.replace(/\D/g, '');
}

/**
 * §28.3 — a guest finding their order again "by number and mobile".
 *
 * A match answers the order and a NEW token, so the browser that proved it can
 * come back without proving it again. A wrong mobile is `null`, identical to an
 * unknown number: the lookup must not become a way to learn which numbers exist.
 *
 * The comparison happens HERE. The mobile is never compared in the browser, and
 * the order's own mobile never leaves this module before the match.
 */
export function lookupOrder(
  orderNumber: string,
  mobile: string,
): { order: OrderPayload; accessToken: string } | null {
  const order = findOrder(orderNumber);
  const given = digitsOf(mobile);
  if (order === null || given.length === 0 || digitsOf(order.contactMobile) !== given) return null;

  return { order, accessToken: grantOrderAccess(order.orderNumber, 'MOBILE') };
}

/** D6 — every grant ever issued for one order, oldest first. Read by the tests. */
export function grantHistoryFor(orderNumber: string): readonly { route: GrantRoute }[] {
  const wanted = canonicalOrderNumber(orderNumber);
  return GRANTS.filter((grant) => grant.orderNumber === wanted).map(({ route }) => ({ route }));
}

/** Test seam. */
export function resetOrderAccess(): void {
  GRANTS.length = 0;
}
