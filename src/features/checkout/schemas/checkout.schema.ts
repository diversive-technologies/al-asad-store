import { z } from 'zod';

import { ADDRESS_RULES } from '@/lib/domain/address';
import {
  garmentStyleIdSchema,
  measurementPointIdSchema,
  orderIdSchema,
  orderNumberSchema,
  productIdSchema,
  profileIdSchema,
} from '@/lib/domain/ids';

/**
 * SSOT-09 — the wire contract for architecture §17 `CheckoutService`.
 *
 * One sentence from §3.1 shapes this entire file: **"Checkout must not contain
 * a conditional per method."** Four payment methods exist at launch and more
 * will follow, and the moment the interface writes `if (method === 'COD')` the
 * fifth one requires editing checkout. So the backend sends a LIST of methods,
 * each already carrying its own label, its own availability and its own
 * post-placement instruction — and the interface renders the list.
 *
 * The same applies to delivery options and to the Cash-on-Delivery cap. §17:
 * "Cash on Delivery is unavailable above the COD cap; the restriction is
 * enforced server-side, never only in the interface." The cap is a number in
 * §32's configuration register that the operator sets and changes; a copy of it
 * here would be a second source of truth AND would not be enforcement, since
 * anyone can post the order anyway (DATA-13).
 */

/** One delivery choice, priced and described by the backend. */
export const deliveryOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** e.g. "Arrives in 3–5 working days" — authored, never assembled here. */
  description: z.string().min(1),
  chargeMinor: z.number().int().nonnegative(),
});

export type DeliveryOption = z.infer<typeof deliveryOptionSchema>;

/**
 * One payment method, with its own availability.
 *
 * `isAvailable` plus `unavailableReason` is the shape that keeps §17's COD-cap
 * rule on the server. The interface disables the control and prints the reason;
 * it never asks why, and never works it out.
 */
export const paymentMethodSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  isAvailable: z.boolean(),
  /** Present only when `isAvailable` is false. Authored copy (ERR-11). */
  unavailableReason: z.string().nullable(),
});

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const orderTotalsSchema = z.object({
  subtotalMinor: z.number().int().nonnegative(),
  discountMinor: z.number().int().nonnegative(),
  deliveryMinor: z.number().int().nonnegative(),
  giftMinor: z.number().int().nonnegative(),
  /** §6.5: `subtotal − discount + delivery + gift`, checked at placement. */
  totalMinor: z.number().int().nonnegative(),
});

export type OrderTotals = z.infer<typeof orderTotalsSchema>;

/** §17 `quote(cart, address, deliveryOption) -> {totals, availableMethods}`. */
export const checkoutQuoteSchema = z
  .object({
    totals: orderTotalsSchema,
    /**
     * The option `totals` is priced with: the one asked for, or — on a first quote,
     * which names none — the backend's default, which checkout then shows chosen.
     *
     * Stated because the options are the backend's list (§3.1). The interface used
     * to open on an id it had written itself, `'standard'`, which prices nothing
     * and marks no radio the day the backend names its options differently.
     */
    deliveryOptionId: z.string().min(1),
    deliveryOptions: z.array(deliveryOptionSchema).min(1),
    paymentMethods: z.array(paymentMethodSchema).min(1),
    /** Whether gift wrapping is offered, and what it costs (§28.2). */
    gift: z.object({ isOffered: z.boolean(), chargeMinor: z.number().int().nonnegative() }),
    /**
     * §34.7 — whether anything in this bag is being CUT, and how long the longest
     * of them takes.
     *
     * A fact rather than the lines themselves: checkout renders no lines and does
     * not need to start. What it needs is to say, on the same screen as the price
     * and before payment, that a cut garment cannot be sent back — and the backend
     * is what decides which lines are cut, so it is what answers (DATA-13).
     */
    madeToMeasure: z.object({
      isPresent: z.boolean(),
      leadTimeDays: z.number().int().nonnegative(),
      /**
       * Whether anything in the order is NOT being cut.
       *
       * The notice says what is still returnable, and that sentence is false on an
       * order of nothing but cut garments — which is the commonest made-to-measure
       * order there is. The backend answers it, because the backend is what knows
       * which lines are cut (DATA-13).
       */
      hasOtherItems: z.boolean(),
    }),
  })
  .refine((quote) => quote.deliveryOptions.some((option) => option.id === quote.deliveryOptionId), {
    error: 'A quote is priced with one of the delivery options it offers.',
  });

export type CheckoutQuote = z.infer<typeof checkoutQuoteSchema>;

/**
 * FORM-01 — ONE schema for the checkout form, source of truth for both the
 * client-side validation and the inferred type.
 *
 * FORM-03: this is a UX affordance. The Java service validates the same fields
 * and is the authority; nothing here is a security boundary.
 *
 * §28.2 requires GUEST checkout, which is why there is no account field and no
 * password: contact details are collected per order, and an order placed this
 * way has a null `customer_id` (§6.5).
 */
export const checkoutFormSchema = z.object({
  /*
   * The four delivery fields COMPOSE `lib/domain/address.ts`, which the saved
   * address book validates against too. Written out here as well, they drifted
   * within one phase: the book bounded the free-text fields and checkout did
   * not, so checkout accepted a line the book would then refuse to save — and
   * the customer met that refusal only after the order was placed.
   *
   * D5 lives on the other side of that import: the national mobile format is
   * `CLIENT.market.mobile`, so another market changes a regex, not a component.
   */
  contactName: ADDRESS_RULES.name,
  contactMobile: ADDRESS_RULES.mobile,
  /** Optional: this market reaches customers by mobile, not by email. */
  contactEmail: z.union([z.email(), z.literal('')]),
  addressLine: ADDRESS_RULES.line,
  addressCity: ADDRESS_RULES.city,
  /* No delivery option: the choice lives with the QUOTE it re-prices
     (`useCheckoutQuote`), and placement sends the option that quote was priced
     with, so the order and the total the customer saw cannot disagree. */
  paymentMethodId: z.string().min(1),
  isGift: z.boolean(),
  giftMessage: z.string().trim().max(200),
});

export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;

/** A line as it was at placement — §6.5 requires snapshots, not references. */
export const orderLineSchema = z.object({
  productId: productIdSchema,
  productCode: z.string().min(1),
  /** The name AS IT WAS. Renaming the product must not alter this order. */
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceMinor: z.number().int().nonnegative(),
  lineTotalMinor: z.number().int().nonnegative(),
  pieces: z.array(
    z.object({
      pieceCode: z.string().min(1),
      name: z.string().min(1),
      size: z.string().min(1),
    }),
  ),
  /**
   * §6.5 as amended — present exactly when the line was CUT rather than picked.
   *
   * The measurements are the SNAPSHOT, copied at placement: §34.7 requires the
   * order line to hold the values, and a reference would be a thing a later
   * profile edit could rewrite.
   */
  stitching: z
    .object({
      garmentStyle: garmentStyleIdSchema,
      styleLabel: z.string().min(1),
      profileId: profileIdSchema,
      chargeMinor: z.number().int().nonnegative(),
      leadTimeDays: z.number().int().positive(),
      measurements: z
        .array(z.object({ pointId: measurementPointIdSchema, mm: z.number().int().positive() }))
        .min(1),
    })
    .nullable(),
});

export type OrderLine = z.infer<typeof orderLineSchema>;

/**
 * §6.6's order states, and §6.5's separate payment lifecycle.
 *
 * They are two enums rather than one because "delivered but not yet paid" is
 * every Cash-on-Delivery order in transit, and a single state cannot say it.
 */
export const orderStateSchema = z.enum([
  'AWAITING_CONFIRMATION',
  'AWAITING_PAYMENT',
  'CONFIRMED',
  'CANCELLED',
  'DISPATCHED',
  'DELIVERED',
]);

export const paymentStateSchema = z.enum([
  'PENDING',
  'AWAITING_CONFIRMATION',
  'AWAITING_TRANSFER',
  'AUTHORIZED',
  'SETTLED',
  'FAILED',
]);

/**
 * How to pay an order whose method is a transfer the customer makes themselves.
 *
 * Present exactly when the backend says the chosen method needs it and `null`
 * otherwise, so the confirmation renders what it was given and never branches on
 * which method was chosen (§3.1). The REFERENCE is the order number: the one
 * identifier the customer already has is what matches the money to the order.
 * SEC-02 — every field is bounded, because a served account is untrusted input.
 */
export const transferInstructionsSchema = z.object({
  reference: orderNumberSchema,
  bankName: z.string().min(1).max(120),
  accountTitle: z.string().min(1).max(120),
  accountNumber: z.string().min(1).max(34),
  /** ISO 13616 caps an IBAN at 34 characters; a Pakistani one is 24. */
  iban: z.string().min(15).max(34),
});

export type TransferInstructions = z.infer<typeof transferInstructionsSchema>;

export const orderSchema = z.object({
  id: orderIdSchema,
  /** What the customer quotes on the phone if they call about the order. */
  orderNumber: orderNumberSchema,
  state: orderStateSchema,
  paymentState: paymentStateSchema,
  placedAt: z.iso.datetime(),
  contactName: z.string().min(1),
  contactMobile: z.string().min(1),
  deliveryAddress: z.string().min(1),
  deliveryCity: z.string().min(1),
  deliveryLabel: z.string().min(1),
  paymentLabel: z.string().min(1),
  isGift: z.boolean(),
  giftMessage: z.string(),
  lines: z.array(orderLineSchema).min(1),
  totals: orderTotalsSchema,
  transferInstructions: transferInstructionsSchema.nullable(),
});

export type Order = z.infer<typeof orderSchema>;
