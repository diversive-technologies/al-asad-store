import { expiryFor, releaseCart } from './bag-reservations';
import type { ProfileOwnerRow } from './profiles-db';

/**
 * D1 — §16's cart RECORDS: carts, their lines and every code tried on them.
 * Split out of `bag-db.ts` (MOD-03), which keeps the operations; this file keeps
 * what those operations write and the D6 rules for how anything leaves.
 *
 * ## D6 — nothing here is ever destroyed
 *
 * A line the customer removes, a line whose hold lapsed, a code they lift and a
 * cart that becomes an order all stay on file with a status. The bag a customer
 * sees is a projection over that history (`bag-projection.ts`).
 */

/**
 * D6 — why a line left the bag.
 *
 * `CUSTOMER` and `EXPIRED` are different facts and the difference is worth
 * keeping: one is someone changing their mind, the other is the store taking
 * the item back because a hold ran out. §26's reporting can tell them apart.
 *
 * `MOVED_TO_WISHLIST` is §16's `moveToWishlist`: the customer took the line out
 * of the bag AND kept the product in their saved items. It is its own reason
 * rather than `CUSTOMER`, because "not now" and "not this" are different
 * answers about the same garment, and only the first still wants it.
 */
export type LineRemovalReason = 'CUSTOMER' | 'EXPIRED' | 'MOVED_TO_WISHLIST';

export interface CartLineRecord {
  id: string;
  productId: string;
  selections: readonly { pieceId: string; sizeId: string }[];
  quantity: number;
  /**
   * §34.8 — the saved profile VERSION this line is cut from, or null when it is
   * picked off the shelf.
   *
   * An id and nothing else: the figures, the style and the date are read from
   * the profile when the line is projected, so a line cannot come to hold a
   * stale copy of a record that lives somewhere else.
   */
  stitchingProfileId: string | null;
  /**
   * WHOSE measurements they are, recorded when the line was added.
   *
   * Every read of a profile is owner-scoped, and a bag summary is rendered long
   * after the request that carried the owner has gone — so the line remembers
   * who it was cut for. It is not on the wire: it is an identity, and the bag
   * has no reason to tell a browser one.
   */
  stitchingOwner: ProfileOwnerRow | null;
  /** D6 — null while the line is in the bag; set once, never unset. */
  removedAt: number | null;
  removalReason: LineRemovalReason | null;
}

/**
 * D6 — a cart is never deleted. Placing its order CONVERTS it, which is better
 * provenance than discarding it: an order can be traced back to the bag that
 * produced it, including the lines that were removed before checkout.
 */
type CartStatus = 'ACTIVE' | 'CONVERTED';

export interface CartRecord {
  lines: CartLineRecord[];
  status: CartStatus;
  /** The order this cart became, once it became one. */
  orderNumber: string | null;
}

/** D6 — every code ever applied, in order. The last un-lifted one is in force. */
interface CodeEvent {
  code: string;
  appliedAt: number;
  liftedAt: number | null;
}

const CARTS = new Map<string, CartRecord>();
const CART_CODES = new Map<string, CodeEvent[]>();

let nextId = 0;

/** Deterministic, RFC-4122-shaped so the schemas' `z.uuid()` accepts them. */
export function mockId(group: string): string {
  nextId += 1;
  return `b1c2d3e4-${group}-4c8a-8f21-${String(nextId).padStart(12, '0')}`;
}

export function createCart(): string {
  const id = mockId('0001');
  CARTS.set(id, { lines: [], status: 'ACTIVE', orderNumber: null });
  return id;
}

export function cartExists(cartId: string): boolean {
  return CARTS.get(cartId)?.status === 'ACTIVE';
}

/** A cart that is still somebody's bag, or `null`. D6: a converted cart is not. */
export function activeCart(cartId: string): CartRecord | null {
  const cart = CARTS.get(cartId);
  return cart === undefined || cart.status !== 'ACTIVE' ? null : cart;
}

/**
 * §7.2 — the cart becomes the order. D6: marked, not deleted.
 *
 * Its holds are released rather than dropped, and the cart stops answering as a
 * bag: the projection returns null for a converted cart, which the handler turns
 * into the same 404 a missing cart gives, so the customer's bag reads empty
 * exactly as it did before this policy.
 */
export function convertCart(cartId: string, orderNumber: string): void {
  const cart = CARTS.get(cartId);
  if (cart === undefined) return;

  releaseCart(cartId);
  cart.status = 'CONVERTED';
  cart.orderNumber = orderNumber;
}

/** The lines still recorded as in the bag. D6: a projection, not the whole record. */
export function activeLines(cart: CartRecord): CartLineRecord[] {
  return cart.lines.filter((line) => line.removedAt === null);
}

/**
 * §16 `moveToWishlist` — whether a line may leave the bag for the saved items.
 *
 * One rule, read by the projection that states it on the line and by the move
 * that enforces it. A line cut to measure may not: what makes it that line is the
 * measurement version it names, and a saved item is a product id and nothing
 * else, so moving it would drop the measurements without a word.
 */
export function isMovableToWishlist(line: CartLineRecord): boolean {
  return line.stitchingProfileId === null;
}

/**
 * A line picked off the shelf whose hold has lapsed (§7.3 read-time exclusion).
 *
 * A cut line holds nothing, so it cannot lapse; asking `expiryFor` about one
 * would report every one of them as lapsed.
 */
export function isLapsed(line: CartLineRecord): boolean {
  return line.stitchingProfileId === null && expiryFor(line.id) === null;
}

/** D6 — a line leaves the bag by being MARKED, with the reason, and is never spliced out. */
export function markRemoved(line: CartLineRecord, reason: LineRemovalReason): void {
  line.removedAt = Date.now();
  line.removalReason = reason;
}

/** The code currently in force, if any. D6: the last un-lifted event. */
export function activeCode(cartId: string): string | undefined {
  const events = CART_CODES.get(cartId) ?? [];
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event !== undefined && event.liftedAt === null) return event.code;
  }
  return undefined;
}

/** D6 — every code in force is LIFTED, never erased. */
export function liftCodes(cartId: string): void {
  const now = Date.now();
  for (const event of CART_CODES.get(cartId) ?? []) {
    if (event.liftedAt === null) event.liftedAt = now;
  }
}

/**
 * D6 — applying a second code lifts the first rather than overwriting it, so the
 * bag's record shows both and the order in which they were tried.
 */
export function recordCode(cartId: string, code: string): void {
  liftCodes(cartId);
  const events = CART_CODES.get(cartId) ?? [];
  events.push({ code, appliedAt: Date.now(), liftedAt: null });
  CART_CODES.set(cartId, events);
}

/**
 * D6 — the full history of a cart, including what left it.
 *
 * The projection the bag returns is what the customer sees; this is what the
 * store keeps. Read by the tests that pin the guarantee.
 */
export function cartHistory(cartId: string): {
  status: CartStatus;
  orderNumber: string | null;
  lines: readonly {
    id: string;
    productId: string;
    quantity: number;
    removalReason: LineRemovalReason | null;
  }[];
  codes: readonly { code: string; liftedAt: number | null }[];
} | null {
  const cart = CARTS.get(cartId);
  if (cart === undefined) return null;

  return {
    status: cart.status,
    orderNumber: cart.orderNumber,
    lines: cart.lines.map(({ id, productId, quantity, removalReason }) => ({
      id,
      productId,
      quantity,
      removalReason,
    })),
    codes: (CART_CODES.get(cartId) ?? []).map(({ code, liftedAt }) => ({ code, liftedAt })),
  };
}

/** Test seam. */
export function resetCarts(): void {
  CARTS.clear();
  CART_CODES.clear();
  nextId = 0;
}
