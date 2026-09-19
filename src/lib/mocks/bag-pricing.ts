import type { Locale } from '@/i18n/locales';

/**
 * D1 — the bag's PRICING: the delivery charge, the free-delivery threshold and
 * the promotional codes. Split out of `bag-db.ts` (MOD-03).
 *
 * DATA-13 is why these constants are HERE and not in the frontend: the
 * free-delivery threshold, the delivery charge and the promotional codes are all
 * commercial settings the operator changes in an admin panel, and a copy on the
 * other side of the wire would drift the first time they did.
 */

/** Pricing settings the operator owns. Minor units throughout (DATA-11). */
const DELIVERY_CHARGE_MINOR = 25_000;
const FREE_DELIVERY_THRESHOLD_MINOR = 1_500_000;

interface PromoCode {
  /** Either a percentage off the subtotal, or a flat amount. Never both. */
  readonly kind: 'PERCENT' | 'FLAT';
  readonly value: number;
  readonly description: Record<Locale, string>;
}

const PROMO_CODES: Record<string, PromoCode> = {
  EID10: {
    kind: 'PERCENT',
    value: 10,
    description: { en: '10% off your order', ur: 'آپ کے آرڈر پر 10٪ رعایت' },
  },
  WELCOME500: {
    kind: 'FLAT',
    value: 50_000,
    description: { en: 'Rs 500 off your first order', ur: 'پہلے آرڈر پر 500 روپے کی رعایت' },
  },
};

const REJECTION: Record<Locale, string> = {
  en: 'That code is not valid.',
  ur: 'یہ کوڈ درست نہیں ہے۔',
};

/** Validity is Pricing's answer, never the UI's. */
export function isKnownCode(code: string): boolean {
  return PROMO_CODES[code] !== undefined;
}

/** Pricing's refusal of a code, in the customer's language. */
export function codeRejection(locale: Locale): string {
  return REJECTION[locale];
}

export interface CartPricingPayload {
  pricing: {
    subtotalMinor: number;
    discountMinor: number;
    deliveryMinor: number;
    totalMinor: number;
    appliedCode: { code: string; description: string } | null;
  };
  freeDelivery: { thresholdMinor: number; remainingMinor: number; isMet: boolean };
}

/** The bag's money, stated rather than derived on the other side of the wire (DATA-13). */
export function priceCart(
  lineTotalsMinor: readonly number[],
  code: string | undefined,
  locale: Locale,
): CartPricingPayload {
  const subtotalMinor = lineTotalsMinor.reduce((total, lineTotal) => total + lineTotal, 0);
  const promo = code === undefined ? undefined : PROMO_CODES[code];

  const discountMinor =
    promo === undefined
      ? 0
      : promo.kind === 'PERCENT'
        ? Math.round((subtotalMinor * promo.value) / 100)
        : Math.min(promo.value, subtotalMinor);

  const payable = subtotalMinor - discountMinor;
  const isMet = payable >= FREE_DELIVERY_THRESHOLD_MINOR;
  const isEmpty = lineTotalsMinor.length === 0;

  // An empty bag is not "free delivery earned"; it has nothing to deliver.
  const deliveryMinor = isEmpty || isMet ? 0 : DELIVERY_CHARGE_MINOR;

  return {
    pricing: {
      subtotalMinor,
      discountMinor,
      deliveryMinor,
      totalMinor: payable + deliveryMinor,
      appliedCode:
        code === undefined || promo === undefined
          ? null
          : { code, description: promo.description[locale] },
    },
    freeDelivery: {
      thresholdMinor: FREE_DELIVERY_THRESHOLD_MINOR,
      remainingMinor: Math.max(0, FREE_DELIVERY_THRESHOLD_MINOR - payable),
      isMet: isMet && !isEmpty,
    },
  };
}
