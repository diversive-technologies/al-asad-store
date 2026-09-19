import type { Locale } from '@/i18n/locales';

import { lineNameFor, summaryFor, type BagSummaryPayload } from './bag-projection';
import { release, reserve, type ReservationKey } from './bag-reservations';
import { resolveSelections } from './bag-selection';
import { addStitched } from './bag-stitched';
import {
  activeCart,
  activeLines,
  isLapsed,
  markRemoved,
  mockId,
  type CartLineRecord,
  type CartRecord,
} from './cart-store';
import { CATALOGUE, type CatalogueRecord } from './catalogue-db';
import { sizeLabelOf } from './product-content-db';
import { toProductDetail } from './product-detail-db';
import type { ProfileOwnerRow } from './profiles-db';

/**
 * D1 — architecture §16 `CartService`, standing in for the Java module.
 *
 * This file is the service's line OPERATIONS and its one public surface. What
 * they write is `cart-store.ts`, what the customer sees is `bag-projection.ts`,
 * the money is `bag-pricing.ts`, codes are `bag-codes.ts`, a cut line is
 * `bag-stitched.ts`, and the reservation transaction lives next door in
 * `bag-reservations.ts` (MOD-03). The split follows §16's own note: Cart
 * "carries the composite logic" of knowing a set is a set, while Inventory
 * "reserves whatever keys it is handed and has no opinion about whether they
 * form a set". `toKeys` below is the whole of that composite logic.
 *
 * ## D6 — nothing here is ever destroyed
 *
 * A line the customer removes, a code they lift and a cart that becomes an
 * order all stay on file with a status. `summaryFor` returns the ACTIVE
 * projection over that history, so what the customer sees is unchanged while
 * the store keeps a complete record of what was in the bag and what left it.
 */

/**
 * §16 — the one place that knows a set is a set.
 *
 * A three-piece SET becomes three keys and a SIMPLE product becomes one; both
 * are handed to the same reservation routine, which has no idea which it got.
 */
function toKeys(line: CartLineRecord, quantity: number): ReservationKey[] {
  return line.selections.map((selection) => ({ ...selection, quantity }));
}

function sameSelections(
  left: readonly { pieceId: string; sizeId: string }[],
  right: readonly { pieceId: string; sizeId: string }[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every((selection) =>
    right.some((other) => other.pieceId === selection.pieceId && other.sizeId === selection.sizeId),
  );
}

export type CartWriteResult =
  | { kind: 'ADDED'; summary: BagSummaryPayload }
  | { kind: 'UNAVAILABLE'; pieceId: string; pieceName: string; sizeLabel: string }
  | { kind: 'NOT_FOUND' };

/**
 * An ADD can also be refused on its measurements (§34), or on the product and
 * sizes it names. Both are kept apart from NOT_FOUND on purpose: that one means
 * "no such cart", and the BFF answers it by replacing the cart — which is exactly
 * wrong for a cart that is fine.
 */
export type AddItemResult =
  CartWriteResult | { kind: 'MEASUREMENTS_REFUSED' } | { kind: 'SELECTION_REFUSED' };

/** The bag after a write, or NOT_FOUND for a cart that stopped being a bag. */
function added(cartId: string, locale: Locale): CartWriteResult {
  const summary = summaryFor(cartId, locale);
  return summary === null ? { kind: 'NOT_FOUND' } : { kind: 'ADDED', summary };
}

/** Names the piece that failed, in the customer's language (§7.1). */
function unavailable(
  productId: string,
  pieceId: string,
  sizeId: string,
  locale: Locale,
): CartWriteResult {
  const record = CATALOGUE.find((entry) => entry.id === productId);
  const detail = record === undefined ? null : toProductDetail(record, locale);
  const piece = detail?.pieces.find((entry) => entry.id === pieceId);

  return {
    kind: 'UNAVAILABLE',
    pieceId,
    pieceName: piece?.name ?? '',
    sizeLabel: piece === undefined ? '' : (sizeLabelOf(piece, sizeId, locale) ?? ''),
  };
}

/** §16 `addItem(cart, product_id, {piece_id -> size}, qty)`. */
export function addItem(
  cartId: string,
  productId: string,
  selections: readonly { pieceId: string; sizeId: string }[],
  quantity: number,
  locale: Locale,
  stitchingProfileId: string | null = null,
  stitchingOwner: ProfileOwnerRow | null = null,
): AddItemResult {
  const cart = activeCart(cartId);
  if (cart === null) return { kind: 'NOT_FOUND' };

  // A product this store does not sell is a refused ADD, never a missing cart.
  const record = CATALOGUE.find((entry) => entry.id === productId);
  if (record === undefined) return { kind: 'SELECTION_REFUSED' };

  /*
   * §34.8 — a garment to be CUT takes a different path through this function
   * and nothing else in the file changes: no size coverage to check, because
   * there are no sizes, and no reservation to take, because a cut garment has
   * not taken a standard size off the shelf and there is no cloth in the
   * fixture to hold instead. §7.1 is untouched — it is simply not reached.
   */
  if (stitchingProfileId !== null) {
    return addStitched(cartId, cart, record, stitchingProfileId, stitchingOwner, quantity, locale);
  }

  // §16 invariant: a size for EVERY piece that has sizes, each one it is offered in;
  // §7.1 step 1 resolves the key of a piece that has none.
  const resolved = resolveSelections(toProductDetail(record, locale), selections);
  if (resolved === null) return { kind: 'SELECTION_REFUSED' };

  return addStocked(cartId, cart, record, resolved, quantity, locale);
}

/** A garment off the shelf, reserved through §7.1 before the line exists. */
function addStocked(
  cartId: string,
  cart: CartRecord,
  record: CatalogueRecord,
  selections: readonly { pieceId: string; sizeId: string }[],
  quantity: number,
  locale: Locale,
): AddItemResult {
  /*
   * D6 — only an ACTIVE line is merged into. Re-adding something the customer
   * removed starts a NEW line, so the removal stays in the record rather than
   * being undone.
   */
  const matching = activeLines(cart).find(
    (line) => line.productId === record.id && sameSelections(line.selections, selections),
  );

  /*
   * A matching line whose hold LAPSED is not merged into either. It stopped
   * being in the bag when its hold ran out (§16), so adding again is a new line
   * of what was asked for — not the old quantity revived with the new one on
   * top. The lapse is recorded as the store taking the item back.
   */
  if (matching !== undefined && isLapsed(matching)) markRemoved(matching, 'EXPIRED');
  const existing = matching?.removedAt === null ? matching : undefined;

  const line: CartLineRecord = existing ?? {
    id: mockId('0002'),
    productId: record.id,
    selections: [...selections],
    quantity: 0,
    removedAt: null,
    removalReason: null,
    stitchingProfileId: null,
    stitchingOwner: null,
  };

  const wanted = line.quantity + quantity;
  const outcome = reserve(cartId, line.id, toKeys(line, wanted));

  if (outcome.kind === 'UNAVAILABLE') {
    return unavailable(record.id, outcome.pieceId, outcome.sizeId, locale);
  }

  // §16: "Reservation and cart line are created in the same transaction." The
  // line is only recorded once the hold exists.
  line.quantity = wanted;
  if (existing === undefined) cart.lines.push(line);

  return added(cartId, locale);
}

/** §16 `updateQuantity(cart, line, qty)`. */
export function updateQuantity(
  cartId: string,
  lineId: string,
  quantity: number,
  locale: Locale,
): CartWriteResult {
  const cart = activeCart(cartId);
  if (cart === null) return { kind: 'NOT_FOUND' };

  const line = activeLines(cart).find((entry) => entry.id === lineId);
  if (line === undefined) return { kind: 'NOT_FOUND' };

  /*
   * A line whose hold lapsed is no longer in the bag, so there is nothing to
   * change — the same answer a line the summary no longer shows has always had.
   * The lapse is recorded rather than quietly re-reserved into a new hold.
   */
  if (isLapsed(line)) {
    markRemoved(line, 'EXPIRED');
    return { kind: 'NOT_FOUND' };
  }

  /* A cut garment holds nothing, so there is nothing to re-reserve: asking for
     two is asking the workshop to cut two, which no shelf has to agree to. */
  if (line.stitchingProfileId === null) {
    const outcome = reserve(cartId, line.id, toKeys(line, quantity));
    if (outcome.kind === 'UNAVAILABLE') {
      return unavailable(line.productId, outcome.pieceId, outcome.sizeId, locale);
    }
  }

  line.quantity = quantity;
  return added(cartId, locale);
}

/**
 * §16 `removeItem(cart, line)` — releases the hold immediately.
 *
 * D6: the line is marked removed, not spliced out. The hold is released on the
 * same call, so stock frees up exactly as before; what changes is that the bag
 * still knows the line was there — and why it left, which is EXPIRED rather
 * than CUSTOMER when the hold had already run out.
 */
export function removeLine(cartId: string, lineId: string, locale: Locale): CartWriteResult {
  const cart = activeCart(cartId);
  if (cart === null) return { kind: 'NOT_FOUND' };

  const line = activeLines(cart).find((entry) => entry.id === lineId);
  if (line !== undefined) {
    const reason = isLapsed(line) ? 'EXPIRED' : 'CUSTOMER';
    release(lineId);
    markRemoved(line, reason);
  }

  return added(cartId, locale);
}

/**
 * §7.2 step 1 — "verify every reservation is still active. If any has expired,
 * ROLLBACK and return the customer to the bag naming the expired items."
 *
 * Returns the names of the lines whose hold lapsed, and records each lapse, so
 * the customer is told once and a second attempt goes on to the rest of §7.2
 * rather than being refused for the same line for ever. Empty means every hold
 * is live.
 */
export function expireLapsedLines(cartId: string, locale: Locale): string[] {
  const cart = activeCart(cartId);
  if (cart === null) return [];

  const lapsed = activeLines(cart).filter(isLapsed);
  for (const line of lapsed) markRemoved(line, 'EXPIRED');

  // Named once each: two sizes of one garment that both lapsed are one thing to look at.
  return [...new Set(lapsed.map((line) => lineNameFor(line, locale)))];
}

/*
 * The rest of §16's surface. The records, the projection and the history moved
 * out under MOD-03; the service a handler or a test talks to did not.
 */
export { applyCode, removeCode, type CodeResult } from './bag-codes';
export { moveToWishlist, type MoveToWishlistResult } from './bag-wishlist-move';
export { cartExists, cartHistory, convertCart, createCart, resetCarts } from './cart-store';
export {
  stitchingFiguresFor,
  summaryFor,
  type BagLinePayload,
  type BagSummaryPayload,
} from './bag-projection';
