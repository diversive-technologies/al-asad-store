import type { Locale } from '@/i18n/locales';

import { discardCart, summaryFor, type BagSummaryPayload } from './bag-db';
import { allocate, expiryFor } from './bag-reservations';

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
  };
}

export interface OrderPayload {
  id: string;
  orderNumber: string;
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
  }[];
  totals: OrderTotalsPayload;
}

export type PlaceOutcome =
  | { kind: 'PLACED'; order: OrderPayload }
  | { kind: 'RESERVATION_EXPIRED'; expiredItems: string[] }
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
export function placeOrder(cartId: string, input: PlaceInput, locale: Locale): PlaceOutcome {
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
  const expiredItems = bag.lines.filter((line) => expiryFor(line.id) === null).map((l) => l.name);
  if (expiredItems.length > 0) return { kind: 'RESERVATION_EXPIRED', expiredItems };

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
  discardCart(cartId);

  return { kind: 'PLACED', order };
}

/** §28.3 tracks a guest order by number and mobile. */
export function findOrder(orderNumber: string): OrderPayload | null {
  return ORDERS.get(orderNumber.trim().toUpperCase()) ?? null;
}

/** Test seam. */
export function resetOrders(): void {
  ORDERS.clear();
  orderSequence = 0;
}
