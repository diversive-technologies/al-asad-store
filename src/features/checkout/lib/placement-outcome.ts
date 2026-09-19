import type { PlaceOrderError } from '../api/checkout-browser';
import type { PlaceOrderResult } from '../schemas/place-order.schema';

/**
 * MOD-04 — what checkout does after a placement that did not leave for the
 * order: what it says, and what it reads again so the screen follows the backend.
 */

/** §7.2's answers other than PLACED, which leaves for the order's own page. */
export type PlacementRefusal = Exclude<PlaceOrderResult, { kind: 'PLACED' }>;

/**
 * What the last attempt came to: one of §7.2's refusals, or `UNCONFIRMED` — no
 * answer at all, which may be a placed order and so is never told to anyone as a
 * failed one (ERR-02).
 */
export type CheckoutOutcome = PlacementRefusal | { kind: 'UNCONFIRMED' };

export interface PlacementFollowUp {
  readonly outcome: CheckoutOutcome;
  /** The quote on screen no longer prices what can be placed. */
  readonly rereadQuote: boolean;
  /** The bag changed on the server, or may have. */
  readonly rereadBag: boolean;
}

/**
 * A refusal §7.2 answered. A moved price and a lapsed hold both re-read the
 * QUOTE: the lapsed items have left the total, and a bag with nothing left in it
 * has nothing to place — without it, the next press was refused again for a
 * total that included items no longer held. The two fixed in the bag re-read it.
 */
export function afterRefusal(refusal: PlacementRefusal): PlacementFollowUp {
  return {
    outcome: refusal,
    rereadQuote: refusal.kind === 'PRICE_CHANGED' || refusal.kind === 'RESERVATION_EXPIRED',
    rereadBag: refusal.kind === 'RESERVATION_EXPIRED' || refusal.kind === 'MEASUREMENTS_CHANGED',
  };
}

/**
 * A placement with no refusal to show (`PlaceOrderError`).
 *
 * `NOT_PLACED` was answered, so "not placed, nothing charged" is true of it.
 * `UNCONFIRMED` was not: the order may exist, so it gets its own words, the bag
 * is re-read — a placed order empties it — and the quote is left alone, since
 * "nothing to check out" over an order that went through would be the wrong
 * thing to say.
 *
 * @param failedReason The words for a placement refused with no reason of its own.
 */
export function afterFailure(error: PlaceOrderError, failedReason: string): PlacementFollowUp {
  return error.kind === 'NOT_PLACED'
    ? {
        outcome: { kind: 'PAYMENT_FAILED', reason: failedReason },
        rereadQuote: false,
        rereadBag: false,
      }
    : { outcome: { kind: 'UNCONFIRMED' }, rereadQuote: false, rereadBag: true };
}
