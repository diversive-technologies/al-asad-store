import type { Locale } from '@/i18n/locales';

import {
  convertCart,
  expireLapsedLines,
  stitchingFiguresFor,
  summaryFor,
  type BagSummaryPayload,
} from './bag-db';
import { allocate } from './bag-reservations';
import { CATALOGUE } from './catalogue-db';
import {
  CAP_REASON,
  COD_CAP_MINOR,
  PAYMENT_METHODS,
  type DeliveryOptionRecord,
  type PaymentMethodRecord,
} from './checkout-config-db';
import { deliveryOptionFor, totalsFor } from './checkout-quote-db';
import {
  nextOrderIdentity,
  recordOrder,
  type OrderPayload,
  type OrderTotalsPayload,
} from './orders-db';
import { isCurrentProfile } from './profiles-db';

/**
 * D1 — architecture §17 `CheckoutService` and the §7.2 placement transaction.
 *
 * §7.2 is the second of the two transactions §7 calls "the correctness core of
 * the system", and it is modelled here for the same reason §7.1 was: its
 * failure paths are the interesting part, and a mock that always succeeds means
 * the interface's handling of them is never once exercised.
 *
 * What the operator tunes — the COD cap, the delivery options and their charges,
 * the gift-wrap charge, the payment methods — is `checkout-config-db.ts`; the
 * quote and the total are `checkout-quote-db.ts`; the orders this inserts are
 * `orders-db.ts` (MOD-03).
 */

export type PlaceOutcome =
  | { kind: 'PLACED'; order: OrderPayload }
  | { kind: 'RESERVATION_EXPIRED'; expiredItems: string[] }
  /**
   * §34.7 — a garment to be cut names the measurements it was added against,
   * and those have been saved again since. Named rather than refused generically,
   * for the reason §7.1 names the piece that failed: the customer has to know
   * which garment to look at.
   */
  | { kind: 'MEASUREMENTS_CHANGED'; restitchedItems: string[] }
  | { kind: 'PRICE_CHANGED'; totals: OrderTotalsPayload }
  | { kind: 'PAYMENT_FAILED'; reason: string }
  /**
   * A payment method or delivery option the store does not offer. Its own kind,
   * answered 400 as the quote answers it: NOT_FOUND means "nothing to check out",
   * and the checkout route reads it that way.
   */
  | { kind: 'INVALID' }
  | { kind: 'NOT_FOUND' };

export interface PlaceInput {
  contactName: string;
  contactMobile: string;
  contactEmail: string;
  addressLine: string;
  addressCity: string;
  deliveryOptionId: string;
  paymentMethodId: string;
  isGift: boolean;
  giftMessage: string;
  expectedTotalMinor: number;
}

type BagLine = BagSummaryPayload['lines'][number];

/** Everything §7.2 has settled by the time it writes the order (step 5). */
interface Placement {
  readonly cartId: string;
  readonly bag: BagSummaryPayload;
  readonly input: PlaceInput;
  readonly method: PaymentMethodRecord;
  readonly option: DeliveryOptionRecord;
  readonly totals: OrderTotalsPayload;
  readonly accountKey: string | null;
  readonly locale: Locale;
}

/**
 * §7.2 step 1b, and it is §34.7's whole point: a line is cut to the figures the
 * customer CONFIRMED, not to whatever is current when they pay.
 *
 * A profile saved again with anything changed between the bag and the checkout
 * mints a new version, and the line still names the old one. ADR 18 says the
 * numbers are taken live at placement and that a later edit must never rewrite
 * what the workshop was told — read together, that means the placement must
 * stop rather than quietly cut to figures nobody reviewed. Cloth gets cut; this
 * is the one place the cost of guessing is a garment.
 */
function restitchedItems(bag: BagSummaryPayload): string[] {
  return bag.lines
    .filter((line) => line.stitching !== null && !isCurrentProfile(line.stitching.profileId))
    .map((line) => line.name);
}

type PlacementCheck =
  { kind: 'REFUSED'; outcome: PlaceOutcome } | { kind: 'CLEAR'; totals: OrderTotalsPayload };

/**
 * The checks that follow once every hold is known to be live — step 1b, step 2
 * and the COD cap — answering either the refusal or the totals the order is
 * written with.
 */
function checkPlacement(
  bag: BagSummaryPayload,
  method: PaymentMethodRecord,
  option: DeliveryOptionRecord,
  input: PlaceInput,
  locale: Locale,
): PlacementCheck {
  const restitched = restitchedItems(bag);
  if (restitched.length > 0) {
    return {
      kind: 'REFUSED',
      outcome: { kind: 'MEASUREMENTS_CHANGED', restitchedItems: restitched },
    };
  }

  /*
   * Step 2 — "Re-price the cart through Pricing at current time. If the total
   * has changed since it was displayed, ROLLBACK and show the customer the new
   * total for explicit confirmation. Prices are never silently changed under a
   * customer at payment."
   */
  const totals = totalsFor(bag, option, input.isGift);
  if (totals.totalMinor !== input.expectedTotalMinor) {
    return { kind: 'REFUSED', outcome: { kind: 'PRICE_CHANGED', totals } };
  }

  // §17: the COD cap is enforced at PLACEMENT, not only when quoting. A client
  // that never called `quote` must still be refused.
  if (method.isCapped && totals.totalMinor > COD_CAP_MINOR) {
    return { kind: 'REFUSED', outcome: { kind: 'PAYMENT_FAILED', reason: CAP_REASON[locale] } };
  }

  return { kind: 'CLEAR', totals };
}

/** Step 5's lines, with SNAPSHOTTED line and piece detail (§6.5). */
function orderLinesFor(
  cartId: string,
  lines: readonly BagLine[],
  orderNumber: string,
): OrderPayload['lines'] {
  return lines.map((line) => ({
    productId: line.productId,
    /* The product's own code, as it was. It used to be built from the LINE's
       position, so the first line of every order read AA-1000 whatever it was. */
    productCode: CATALOGUE.find((record) => record.id === line.productId)?.code ?? '',
    // The name AS IT WAS. An order is a historical record (§6.5).
    productName: line.name,
    quantity: line.quantity,
    unitPriceMinor: line.unitPriceMinor,
    lineTotalMinor: line.lineTotalMinor,
    pieces: line.pieces.map((piece, pieceIndex) => ({
      pieceCode: `${orderNumber}-P${String(pieceIndex + 1)}`,
      name: piece.name,
      size: piece.sizeLabel,
    })),
    stitching: snapshotOf(cartId, line),
  }));
}

/** Steps 5 and 6 — the order, and its payment record's initial state. */
function orderFor(placement: Placement): OrderPayload {
  const { input, method, option, locale } = placement;
  const { id, orderNumber } = nextOrderIdentity();

  return {
    id,
    orderNumber,
    accountKey: placement.accountKey,
    // Step 6 — the payment record's initial state, which differs per method and
    // is the ONLY place that difference is expressed.
    state: method.orderState,
    paymentState: method.paymentState,
    placedAt: new Date().toISOString(),
    contactName: input.contactName,
    contactMobile: input.contactMobile,
    deliveryAddress: input.addressLine,
    deliveryCity: input.addressCity,
    deliveryLabel: option.label[locale],
    paymentLabel: method.label[locale],
    isGift: input.isGift,
    giftMessage: input.isGift ? input.giftMessage : '',
    lines: orderLinesFor(placement.cartId, placement.bag.lines, orderNumber),
    totals: placement.totals,
    // The order number IS the reference, so the transfer and the order meet on one identifier.
    transferInstructions:
      method.transferAccount === null
        ? null
        : { ...method.transferAccount, reference: orderNumber },
  };
}

/** §7.2 — placing an order. The steps below are that transaction, in order. */
export function placeOrder(
  cartId: string,
  input: PlaceInput,
  locale: Locale,
  accountKey: string | null = null,
): PlaceOutcome {
  const method = PAYMENT_METHODS.find((entry) => entry.id === input.paymentMethodId);
  const option = deliveryOptionFor(input.deliveryOptionId);
  if (method === undefined || option === null) return { kind: 'INVALID' };

  // BEGIN TRANSACTION

  /*
   * Step 1 — "verify every reservation is still active. If any has expired,
   * ROLLBACK and return the customer to the bag naming the expired items."
   *
   * Asked of the cart's own lines BEFORE the summary, because the summary leaves
   * a lapsed line out — right for showing a bag, and exactly what used to make
   * the lapse impossible to name here. A cut line holds nothing and cannot lapse.
   */
  const expiredItems = expireLapsedLines(cartId, locale);
  if (expiredItems.length > 0) return { kind: 'RESERVATION_EXPIRED', expiredItems };

  const bag = summaryFor(cartId, locale);
  if (bag === null || bag.lines.length === 0) return { kind: 'NOT_FOUND' };

  const checked = checkPlacement(bag, method, option, input, locale);
  if (checked.kind === 'REFUSED') return checked.outcome;

  /*
   * Steps 3 and 4 — sort the piece keys, then convert reserved stock into
   * allocated and settle the reservation rows. This is the moment the stock
   * stops being held and becomes owed.
   */
  if (!allocate(cartId)) return { kind: 'NOT_FOUND' };

  // Steps 5 and 6 — INSERT the order and its payment record.
  const { totals } = checked;
  const order = orderFor({ cartId, bag, input, method, option, totals, accountKey, locale });
  recordOrder(order);

  // COMMIT

  /*
   * Steps 7 and 8, deliberately after the commit: `PaymentMethod.initiate()`
   * and the confirmation notifications. This mock has no gateway to call and no
   * SMS to send, and pretending otherwise would invent a failure mode that does
   * not exist.
   *
   * D6 — the cart is CONVERTED, not discarded: an order can be traced back to
   * the bag that produced it, including the lines removed before checkout.
   */
  convertCart(cartId, order.orderNumber);

  return { kind: 'PLACED', order };
}

/**
 * The measurement snapshot §34.7 requires on the order line.
 *
 * The FIGURES, copied — not the profile id alone. "A later profile edit must
 * never rewrite what the workshop was told" (ADR 18), and a reference is exactly
 * a thing a later edit can rewrite. The id travels too, so an order can still be
 * traced back to the save it came from.
 */
function snapshotOf(cartId: string, line: BagLine): OrderPayload['lines'][number]['stitching'] {
  if (line.stitching === null) return null;

  return {
    garmentStyle: line.stitching.garmentStyle,
    styleLabel: line.stitching.styleLabel,
    profileId: line.stitching.profileId,
    chargeMinor: line.stitching.chargeMinor,
    leadTimeDays: line.stitching.leadTimeDays,
    /* Asked of the BAG, not of the profile store: the bag is what knows whose
       measurements this line names, and that identity never reaches the wire. */
    measurements: stitchingFiguresFor(cartId, line.id),
  };
}

/*
 * The quote and the order reads, re-exported so this module stays the one surface
 * §17's handlers and tests talk to — they moved under MOD-03, the service did not.
 */
export { deliveryOptionFor, quoteFor, type CheckoutQuotePayload } from './checkout-quote-db';
export {
  findOrder,
  ordersFor,
  resetOrders,
  type AccountOrderRow,
  type OrderPayload,
  type OrderTotalsPayload,
} from './orders-db';
