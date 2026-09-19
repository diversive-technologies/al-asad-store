import type { Locale } from '@/i18n/locales';

import { summaryFor, type BagSummaryPayload } from './bag-db';
import {
  CAP_REASON,
  COD_CAP_MINOR,
  DEFAULT_DELIVERY_OPTION_ID,
  DELIVERY_OPTIONS,
  GIFT_CHARGE_MINOR,
  PAYMENT_METHODS,
  type DeliveryOptionRecord,
} from './checkout-config-db';
import type { OrderTotalsPayload } from './orders-db';

/**
 * D1 — §17 `quote`, and the one place an order's total is computed. Split out
 * of `checkout-db.ts` (MOD-03): placement re-prices through `totalsFor` too, so
 * the total a customer is quoted and the total §7.2 step 2 compares against are
 * the same arithmetic.
 */

/**
 * The delivery option a quote or a placement names — or, for a quote that names
 * none, the register's default. `null` for an id the store does not offer, which
 * is REFUSED: it used to be priced as the first option, so a quote answered with
 * totals for an order that placement then refused as NOT_FOUND.
 */
export function deliveryOptionFor(optionId: string | null): DeliveryOptionRecord | null {
  const wanted = optionId ?? DEFAULT_DELIVERY_OPTION_ID;
  return DELIVERY_OPTIONS.find((entry) => entry.id === wanted) ?? null;
}

function deliveryChargeFor(option: DeliveryOptionRecord, bag: BagSummaryPayload): number {
  // Free delivery is earned against the bag's own threshold, and the bag has
  // already worked out whether it was met (§28.2). Nothing recomputes it here.
  return bag.freeDelivery.isMet ? 0 : option.chargeMinor;
}

/** §6.5: `total = subtotal − discount + delivery + gift`, computed in ONE place. */
export function totalsFor(
  bag: BagSummaryPayload,
  option: DeliveryOptionRecord,
  isGift: boolean,
): OrderTotalsPayload {
  const deliveryMinor = deliveryChargeFor(option, bag);
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
  /** The option these totals are priced with: the one asked for, or the default. */
  deliveryOptionId: string;
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

/**
 * §17 `quote(cart, address, deliveryOption) -> {totals, availableMethods}`.
 *
 * `deliveryOptionId` null asks for the default option. `null` back is "nothing to
 * quote": no bag, or an option the store does not offer — the handler asks
 * `deliveryOptionFor` first, so the two reach the BFF as different answers.
 */
export function quoteFor(
  cartId: string,
  locale: Locale,
  deliveryOptionId: string | null,
  isGift: boolean,
): CheckoutQuotePayload | null {
  const option = deliveryOptionFor(deliveryOptionId);
  const bag = summaryFor(cartId, locale);
  if (option === null || bag === null || bag.lines.length === 0) return null;

  const totals = totalsFor(bag, option, isGift);

  return {
    totals,
    deliveryOptionId: option.id,
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
