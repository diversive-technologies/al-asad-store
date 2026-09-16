import type { Locale } from '@/i18n/locales';

import { convertCart, stitchingFiguresFor, summaryFor, type BagSummaryPayload } from './bag-db';
import { allocate, expiryFor } from './bag-reservations';
import { isCurrentProfile } from './profiles-db';

/**
 * D1 — architecture §17 `CheckoutService` and the §7.2 placement transaction.
 *
 * §7.2 is the second of the two transactions §7 calls "the correctness core of
 * the system", and it is modelled here for the same reason §7.1 was: its
 * failure paths are the interesting part, and a mock that always succeeds means
 * the interface's handling of them is never once exercised.
 *
 * Everything the operator will tune lives here, in the BACKEND, because §32
 * lists all of it as configuration: the COD cap, the delivery options and their
 * charges, the gift-wrap charge. A copy of any of them on the other side of the
 * wire would drift the day it changed, and would not be enforcement anyway.
 */

/** §32 register, row 1: "COD maximum order value — to be set." */
const COD_CAP_MINOR = 2_500_000;
const GIFT_CHARGE_MINOR = 30_000;

interface DeliveryOptionRecord {
  readonly id: string;
  readonly chargeMinor: number;
  readonly label: Record<Locale, string>;
  readonly description: Record<Locale, string>;
}

/** §32 register, row 4: "Delivery options, charges, transit times — to be set." */
const DELIVERY_OPTIONS: readonly DeliveryOptionRecord[] = [
  {
    id: 'standard',
    chargeMinor: 25_000,
    label: { en: 'Standard delivery', ur: 'عام ترسیل' },
    description: {
      en: 'Arrives in 3 to 5 working days.',
      ur: 'تین سے پانچ کام کے دنوں میں پہنچتی ہے۔',
    },
  },
  {
    id: 'express',
    chargeMinor: 60_000,
    label: { en: 'Express delivery', ur: 'فوری ترسیل' },
    description: {
      en: 'Arrives in 1 to 2 working days.',
      ur: 'ایک سے دو کام کے دنوں میں پہنچتی ہے۔',
    },
  },
];

interface PaymentMethodRecord {
  readonly id: string;
  readonly label: Record<Locale, string>;
  readonly description: Record<Locale, string>;
  /** §6.6: which state the ORDER enters, and which the PAYMENT enters. */
  readonly orderState: 'AWAITING_CONFIRMATION' | 'AWAITING_PAYMENT' | 'CONFIRMED';
  readonly paymentState: 'PENDING' | 'AWAITING_CONFIRMATION' | 'AWAITING_TRANSFER' | 'AUTHORIZED';
  /** Only Cash on Delivery is capped, and the cap is checked here. */
  readonly isCapped: boolean;
}

/**
 * The four methods of §28.2.
 *
 * §3.1 rejects a `charge(order)` abstraction because Cash on Delivery has
 * nothing to charge at checkout, and a subtype that cannot honour its
 * supertype's contract violates LSP. What survives is `initiate` — which every
 * method CAN do, and which means something different for each.
 *
 * The confirmation screen used to render a per-method `nextStep` sentence, and
 * that field is gone: this MVP has no confirmation or tracking flow, so there
 * was nothing truthful to promise. The states below still differ per method,
 * because §6.6 says they do — the interface simply does not narrate them yet.
 */
const PAYMENT_METHODS: readonly PaymentMethodRecord[] = [
  {
    id: 'cod',
    label: { en: 'Cash on delivery', ur: 'ڈیلیوری پر ادائیگی' },
    description: {
      en: 'Pay the courier in cash when your order arrives.',
      ur: 'آرڈر پہنچنے پر کورئیر کو نقد ادائیگی کریں۔',
    },
    orderState: 'AWAITING_CONFIRMATION',
    paymentState: 'AWAITING_CONFIRMATION',
    isCapped: true,
  },
  {
    id: 'card',
    label: { en: 'Debit or credit card', ur: 'ڈیبٹ یا کریڈٹ کارڈ' },
    description: {
      en: 'Visa and Mastercard, authorised before dispatch.',
      ur: 'ویزا اور ماسٹر کارڈ، روانگی سے پہلے منظور شدہ۔',
    },
    orderState: 'AWAITING_PAYMENT',
    paymentState: 'AUTHORIZED',
    isCapped: false,
  },
  {
    id: 'wallet',
    label: { en: 'Mobile wallet', ur: 'موبائل والٹ' },
    description: {
      en: 'JazzCash or Easypaisa, from your mobile account.',
      ur: 'جاز کیش یا ایزی پیسہ، آپ کے موبائل اکاؤنٹ سے۔',
    },
    orderState: 'AWAITING_PAYMENT',
    paymentState: 'AUTHORIZED',
    isCapped: false,
  },
  {
    id: 'bank',
    label: { en: 'Bank transfer', ur: 'بینک ٹرانسفر' },
    description: {
      en: 'Transfer the total to our account using the reference we issue.',
      ur: 'جاری کردہ حوالہ نمبر کے ساتھ رقم ہمارے اکاؤنٹ میں منتقل کریں۔',
    },
    orderState: 'AWAITING_PAYMENT',
    paymentState: 'AWAITING_TRANSFER',
    isCapped: false,
  },
];

const CAP_REASON: Record<Locale, string> = {
  en: 'Not available on orders above this value. Please choose another method.',
  ur: 'اس رقم سے زیادہ کے آرڈر پر دستیاب نہیں۔ براہِ کرم دوسرا طریقہ منتخب کریں۔',
};

export interface OrderTotalsPayload {
  subtotalMinor: number;
  discountMinor: number;
  deliveryMinor: number;
  giftMinor: number;
  totalMinor: number;
}

function deliveryChargeFor(optionId: string, bag: BagSummaryPayload): number {
  const option = DELIVERY_OPTIONS.find((entry) => entry.id === optionId) ?? DELIVERY_OPTIONS[0];
  // Free delivery is earned against the bag's own threshold, and the bag has
  // already worked out whether it was met (§28.2). Nothing recomputes it here.
  return bag.freeDelivery.isMet ? 0 : (option?.chargeMinor ?? 0);
}

/** §6.5: `total = subtotal − discount + delivery + gift`, computed in ONE place. */
function totalsFor(bag: BagSummaryPayload, optionId: string, isGift: boolean): OrderTotalsPayload {
  const deliveryMinor = deliveryChargeFor(optionId, bag);
  const giftMinor = isGift ? GIFT_CHARGE_MINOR : 0;

  return {
    subtotalMinor: bag.pricing.subtotalMinor,
    discountMinor: bag.pricing.discountMinor,
    deliveryMinor,
    giftMinor,
    totalMinor: bag.pricing.subtotalMinor - bag.pricing.discountMinor + deliveryMinor + giftMinor,
  };
}

export interface CheckoutQuotePayload {
  totals: OrderTotalsPayload;
  deliveryOptions: { id: string; label: string; description: string; chargeMinor: number }[];
  paymentMethods: {
    id: string;
    label: string;
    description: string;
    isAvailable: boolean;
    unavailableReason: string | null;
  }[];
  gift: { isOffered: boolean; chargeMinor: number };
  madeToMeasure: { isPresent: boolean; leadTimeDays: number; hasOtherItems: boolean };
}

/** §17 `quote(cart, address, deliveryOption) -> {totals, availableMethods}`. */
export function quoteFor(
  cartId: string,
  locale: Locale,
  deliveryOptionId: string,
  isGift: boolean,
): CheckoutQuotePayload | null {
  const bag = summaryFor(cartId, locale);
  if (bag === null || bag.lines.length === 0) return null;

  const totals = totalsFor(bag, deliveryOptionId, isGift);

  return {
    totals,
    deliveryOptions: DELIVERY_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label[locale],
      description: option.description[locale],
      // Shown as it will actually be charged, so a customer who has earned free
      // delivery is not quoted a price they will not pay.
      chargeMinor: bag.freeDelivery.isMet ? 0 : option.chargeMinor,
    })),
    /*
     * §17's COD cap, applied HERE. The interface receives a disabled method and
     * a reason; it never sees the cap and could not enforce it if it did.
     */
    paymentMethods: PAYMENT_METHODS.map((method) => {
      const isOverCap = method.isCapped && totals.totalMinor > COD_CAP_MINOR;

      return {
        id: method.id,
        label: method.label[locale],
        description: method.description[locale],
        isAvailable: !isOverCap,
        unavailableReason: isOverCap ? CAP_REASON[locale] : null,
      };
    }),
    gift: { isOffered: true, chargeMinor: GIFT_CHARGE_MINOR },
    /* §34.7 — the LONGEST lead time in the bag, because that is when the order
       can go out, not the average of what is in it. */
    madeToMeasure: {
      isPresent: bag.lines.some((line) => line.stitching !== null),
      leadTimeDays: bag.lines.reduce(
        (longest, line) => Math.max(longest, line.stitching?.leadTimeDays ?? 0),
        0,
      ),
      hasOtherItems: bag.lines.some((line) => line.stitching === null),
    },
  };
}

export interface OrderPayload {
  id: string;
  orderNumber: string;
  /**
   * Whose order it is, or null for a guest — §6.5's `customer_id` is nullable
   * for exactly this reason, and §28.2 makes guest checkout Release 1 scope.
   *
   * It arrives as a HEADER the BFF attached from the session, never from the
   * body: an order that named its own customer would let any browser file an
   * order under anyone's account and read it back from their history.
   */
  accountKey: string | null;
  state: string;
  paymentState: string;
  placedAt: string;
  contactName: string;
  contactMobile: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryLabel: string;
  paymentLabel: string;
  isGift: boolean;
  giftMessage: string;
  lines: {
    productId: string;
    productCode: string;
    productName: string;
    quantity: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
    pieces: { pieceCode: string; name: string; size: string }[];
    /**
     * §6.5 as amended — the fulfilment kind, and for a garment being CUT an
     * IMMUTABLE measurement snapshot: the figures themselves, copied, never a
     * reference. A later edit to the profile cannot reach an order, and the
     * workshop is told what the customer confirmed.
     */
    stitching: {
      garmentStyle: string;
      styleLabel: string;
      profileId: string;
      chargeMinor: number;
      leadTimeDays: number;
      measurements: { pointId: string; mm: number }[];
    } | null;
  }[];
  totals: OrderTotalsPayload;
}

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

const ORDERS = new Map<string, OrderPayload>();
let orderSequence = 0;

/** §7.2 — placing an order. The steps below are that transaction, in order. */
export function placeOrder(
  cartId: string,
  input: PlaceInput,
  locale: Locale,
  accountKey: string | null = null,
): PlaceOutcome {
  const bag = summaryFor(cartId, locale);
  if (bag === null || bag.lines.length === 0) return { kind: 'NOT_FOUND' };

  const method = PAYMENT_METHODS.find((entry) => entry.id === input.paymentMethodId);
  const option = DELIVERY_OPTIONS.find((entry) => entry.id === input.deliveryOptionId);
  if (method === undefined || option === undefined) return { kind: 'NOT_FOUND' };

  // BEGIN TRANSACTION

  /*
   * Step 1 — "verify every reservation is still active. If any has expired,
   * ROLLBACK and return the customer to the bag naming the expired items."
   *
   * `summaryFor` already drops lapsed lines, so an expired hold shows up as a
   * line that has gone. Comparing against what the customer was quoting on is
   * what makes it nameable rather than a silent shrink.
   */
  const expiredItems = bag.lines
    /* §34.8's cut line holds nothing, so it cannot have expired. Asking
       `expiryFor` about it would report every one of them as lapsed. */
    .filter((line) => line.stitching === null && expiryFor(line.id) === null)
    .map((l) => l.name);
  if (expiredItems.length > 0) return { kind: 'RESERVATION_EXPIRED', expiredItems };

  /*
   * Step 1b, and it is §34.7's whole point: a line is cut to the figures the
   * customer CONFIRMED, not to whatever is current when they pay.
   *
   * A profile saved again between the bag and the checkout mints a new version,
   * and the line still names the old one. ADR 18 says the numbers are taken live
   * at placement and that a later edit must never rewrite what the workshop was
   * told — read together, that means the placement must stop rather than quietly
   * cut to figures nobody reviewed. Cloth gets cut; this is the one place the
   * cost of guessing is a garment.
   */
  const restitched = bag.lines
    .filter((line) => line.stitching !== null && !isCurrentProfile(line.stitching.profileId))
    .map((line) => line.name);
  if (restitched.length > 0) return { kind: 'MEASUREMENTS_CHANGED', restitchedItems: restitched };

  /*
   * Step 2 — "Re-price the cart through Pricing at current time. If the total
   * has changed since it was displayed, ROLLBACK and show the customer the new
   * total for explicit confirmation. Prices are never silently changed under a
   * customer at payment."
   */
  const totals = totalsFor(bag, input.deliveryOptionId, input.isGift);
  if (totals.totalMinor !== input.expectedTotalMinor) {
    return { kind: 'PRICE_CHANGED', totals };
  }

  // §17: the COD cap is enforced at PLACEMENT, not only when quoting. A client
  // that never called `quote` must still be refused.
  if (method.isCapped && totals.totalMinor > COD_CAP_MINOR) {
    return { kind: 'PAYMENT_FAILED', reason: CAP_REASON[locale] };
  }

  /*
   * Steps 3 and 4 — sort the piece keys, then convert reserved stock into
   * allocated and delete the reservation rows. This is the moment the stock
   * stops being held and becomes owed.
   */
  const allocated = allocate(cartId);
  if (!allocated) return { kind: 'NOT_FOUND' };

  // Step 5 — INSERT the order, with SNAPSHOTTED line and piece detail (§6.5).
  orderSequence += 1;
  const orderNumber = `AA${String(100_000 + orderSequence)}`;

  const order: OrderPayload = {
    id: `c1d2e3f4-0001-4c8a-8f21-${String(orderSequence).padStart(12, '0')}`,
    orderNumber,
    accountKey,
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
    lines: bag.lines.map((line, index) => ({
      productId: line.productId,
      productCode: `AA-${String(1000 + index)}`,
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
    })),
    totals,
  };

  ORDERS.set(orderNumber, order);

  // COMMIT

  /*
   * Steps 7 and 8, deliberately after the commit: `PaymentMethod.initiate()`
   * and the confirmation notifications. Here they are the `nextStep` string
   * already on the order — this mock has no gateway to call and no SMS to send,
   * and pretending otherwise would invent a failure mode that does not exist.
   */
  // D6 — the cart is CONVERTED, not discarded: an order can be traced back to
  // the bag that produced it, including the lines removed before checkout.
  convertCart(cartId, orderNumber);

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
function snapshotOf(cartId: string, line: BagSummaryPayload['lines'][number]) {
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

/** §28.3 tracks a guest order by number and mobile. */
export function findOrder(orderNumber: string): OrderPayload | null {
  return ORDERS.get(orderNumber.trim().toUpperCase()) ?? null;
}

export interface AccountOrderRow {
  orderNumber: string;
  placedAt: string;
  totalMinor: number;
  /**
   * How many PRODUCTS the order holds, not how many units.
   *
   * The row reads "Plain Waistcoat Suit and 2 more", and counting units made
   * that sentence lie about the commonest case there is: one garment bought
   * three times came out as "and 2 more", which names two garments nobody
   * ordered. What the phrase counts has to be what it says.
   */
  lineCount: number;
  /** The first line's name AS IT WAS, which is what makes an order recognisable. */
  firstItem: string;
}

/**
 * §28.3 — what one customer has bought, newest first.
 *
 * A REDUCED projection rather than the orders themselves: a list needs enough to
 * recognise an order and follow it, and shipping every snapshotted line and
 * piece to draw four lines of summary would put a customer's whole purchase
 * history on the wire to render a date and a total.
 *
 * An empty account key matches nothing. A guest's orders carry null and are
 * found by their number (§28.3), which is the only thing that addresses them.
 */
export function ordersFor(accountKey: string): AccountOrderRow[] {
  if (accountKey.length === 0) return [];

  return (
    [...ORDERS.values()]
      .filter((order) => order.accountKey === accountKey)
      /*
       * The order NUMBER breaks the tie, and it has to: `placedAt` is a
       * millisecond stamp, two orders can carry the same one, and a stable sort
       * then leaves them in insertion order — which is oldest first, the reverse
       * of what this function promises. The number is monotonic by construction,
       * so it orders them even when the clock does not.
       */
      .sort(
        (one, other) =>
          other.placedAt.localeCompare(one.placedAt) ||
          other.orderNumber.localeCompare(one.orderNumber),
      )
      .map((order) => ({
        orderNumber: order.orderNumber,
        placedAt: order.placedAt,
        totalMinor: order.totals.totalMinor,
        lineCount: order.lines.length,
        firstItem: order.lines[0]?.productName ?? '',
      }))
  );
}

/** Test seam. */
export function resetOrders(): void {
  ORDERS.clear();
  orderSequence = 0;
}
