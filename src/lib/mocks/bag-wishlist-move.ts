import type { Locale } from '@/i18n/locales';

import { summaryFor, type BagSummaryPayload } from './bag-projection';
import { release } from './bag-reservations';
import { activeCart, activeLines, isLapsed, isMovableToWishlist, markRemoved } from './cart-store';
import { saveItem } from './wishlist-db';

/**
 * D1 — §16 `moveToWishlist(cart, line)`, standing in for the Java module. Split
 * out of `bag-db.ts` (MOD-03), which re-exports it as part of the cart's surface.
 *
 * ONE operation rather than a removal followed by a save, and that is the point
 * of it being on §16's list at all: done from the browser as two calls, a failure
 * between them either loses the garment from both places or leaves it in both.
 * Here the product joins the account's saved items and the line leaves the bag in
 * the same step, so neither happens without the other.
 *
 * D6 — the line is MARKED, never spliced out, with `MOVED_TO_WISHLIST` as the
 * reason, and its hold is released at once exactly as a removal releases it
 * (§16's fourth invariant). The saved item is a new row on the account's list.
 */

export type MoveToWishlistResult =
  | { kind: 'MOVED'; summary: BagSummaryPayload }
  /**
   * The line had already left the bag — removed in another tab, or settled as
   * lapsed by something that acted on it — so nothing was saved. The bag as it
   * now is travels with the answer, so the interface can stop showing the line.
   */
  | { kind: 'NOT_IN_BAG'; summary: BagSummaryPayload }
  /**
   * A made-to-measure line (§34.8). What makes it that line is the measurement
   * VERSION it names, and a saved item is a product id and nothing else — so a
   * move would quietly throw the measurements away and bring the customer back
   * to a garment with no sizes and no figures. It stays in the bag instead.
   */
  | { kind: 'NOT_MOVABLE' }
  /** No such cart, or a cart that stopped being a bag (D6: converted). */
  | { kind: 'NOT_FOUND' };

/**
 * Moves one line of the bag into the saved items of `accountKey`.
 *
 * WHOSE list is never in the request body: the key arrives in the header the BFF
 * attached from the session, and the handler refuses a request without one before
 * this is reached.
 *
 * A line whose hold had lapsed but that nothing had settled yet is still moved:
 * the customer can see it and asked to keep the garment, and the garment is what
 * a saved item is. Its leaving is recorded as `EXPIRED`, because the store had
 * already taken the units back — which reason is true does not change with what
 * the customer pressed afterwards.
 */
export function moveToWishlist(
  cartId: string,
  lineId: string,
  accountKey: string,
  locale: Locale,
): MoveToWishlistResult {
  const cart = activeCart(cartId);
  if (cart === null) return { kind: 'NOT_FOUND' };

  const line = activeLines(cart).find((entry) => entry.id === lineId);
  if (line === undefined) return answered(cartId, locale, 'NOT_IN_BAG');
  if (!isMovableToWishlist(line)) return { kind: 'NOT_MOVABLE' };

  saveItem(accountKey, line.productId);
  const reason = isLapsed(line) ? 'EXPIRED' : 'MOVED_TO_WISHLIST';
  release(line.id);
  markRemoved(line, reason);

  return answered(cartId, locale, 'MOVED');
}

/** The bag after the move, under the kind that says what happened to the line. */
function answered(
  cartId: string,
  locale: Locale,
  kind: 'MOVED' | 'NOT_IN_BAG',
): MoveToWishlistResult {
  const summary = summaryFor(cartId, locale);
  return summary === null ? { kind: 'NOT_FOUND' } : { kind, summary };
}
