import type { Locale } from '@/i18n/locales';

/**
 * D1 — the §32 configuration register as §17 `CheckoutService` reads it: the
 * COD cap, the gift-wrap charge, the delivery options and the payment methods.
 * Split out of `checkout-db.ts` (MOD-03).
 *
 * Everything the operator will tune lives here, in the BACKEND, because §32
 * lists all of it as configuration. A copy of any of it on the other side of the
 * wire would drift the day it changed, and would not be enforcement anyway.
 *
 * ## FIXTURE — the bank account below is NOT the client's
 *
 * `STORE_TRANSFER_ACCOUNT` is invented: the bank name, the account title, the
 * account number and the IBAN are placeholders shaped like the real thing, and
 * the account number and IBAN are all zeros so nobody can pay into them by
 * mistake. The client supplies the real account; until then this must be named
 * aloud at any demo, because it is the one figure on the confirmation a
 * customer would act on with their own money.
 */

/** Where a bank transfer is paid, as the order carries it. */
export interface TransferAccount {
  readonly bankName: string;
  readonly accountTitle: string;
  readonly accountNumber: string;
  readonly iban: string;
}

/** FIXTURE — see the file header. Replace with the client's account; change nothing else. */
const STORE_TRANSFER_ACCOUNT: TransferAccount = {
  bankName: 'Example Bank',
  accountTitle: 'Al-Asad Collections',
  accountNumber: '0000000000000000',
  iban: 'PK00EXMP0000000000000000',
};

/** §32 register, row 1: "COD maximum order value — to be set." */
export const COD_CAP_MINOR = 2_500_000;
export const GIFT_CHARGE_MINOR = 30_000;

export interface DeliveryOptionRecord {
  readonly id: string;
  readonly chargeMinor: number;
  readonly label: Record<Locale, string>;
  readonly description: Record<Locale, string>;
}

/** §32 register, row 4: "Delivery options, charges, transit times — to be set." */
export const DELIVERY_OPTIONS: readonly DeliveryOptionRecord[] = [
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

/**
 * The option a quote is priced with when the customer has not chosen one, and so
 * the one checkout shows chosen at first. The register's to set (§32 row 4): the
 * storefront names no option on its first quote and renders what it is told.
 */
export const DEFAULT_DELIVERY_OPTION_ID = 'standard';

export interface PaymentMethodRecord {
  readonly id: string;
  readonly label: Record<Locale, string>;
  readonly description: Record<Locale, string>;
  /** §6.6: which state the ORDER enters, and which the PAYMENT enters. */
  readonly orderState: 'AWAITING_CONFIRMATION' | 'AWAITING_PAYMENT' | 'CONFIRMED';
  readonly paymentState: 'PENDING' | 'AWAITING_CONFIRMATION' | 'AWAITING_TRANSFER' | 'AUTHORIZED';
  /** Only Cash on Delivery is capped, and the cap is checked here. */
  readonly isCapped: boolean;
  /**
   * Where the money goes, for a method paid by the customer moving it
   * themselves; `null` for every method that is not. The order carries it with
   * the order number as the reference, so the confirmation has something to pay
   * into rather than a promise of "the reference we issue".
   */
  readonly transferAccount: TransferAccount | null;
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
export const PAYMENT_METHODS: readonly PaymentMethodRecord[] = [
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
    transferAccount: null,
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
    transferAccount: null,
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
    transferAccount: null,
  },
  {
    id: 'bank',
    label: { en: 'Bank transfer', ur: 'بینک ٹرانسفر' },
    description: {
      en: 'Transfer the total to our account, with your order number as the reference. The account details are shown once the order is placed.',
      ur: 'کل رقم ہمارے اکاؤنٹ میں منتقل کریں اور حوالے میں اپنا آرڈر نمبر لکھیں۔ اکاؤنٹ کی تفصیلات آرڈر دینے کے بعد دکھائی جاتی ہیں۔',
    },
    orderState: 'AWAITING_PAYMENT',
    paymentState: 'AWAITING_TRANSFER',
    isCapped: false,
    transferAccount: STORE_TRANSFER_ACCOUNT,
  },
];

export const CAP_REASON: Record<Locale, string> = {
  en: 'Not available on orders above this value. Please choose another method.',
  ur: 'اس رقم سے زیادہ کے آرڈر پر دستیاب نہیں۔ براہِ کرم دوسرا طریقہ منتخب کریں۔',
};
