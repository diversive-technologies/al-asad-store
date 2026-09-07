import { z } from 'zod';

import { CLIENT } from '@/config/client';
import { orderIdSchema, productIdSchema } from '@/lib/domain/ids';

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
export const checkoutQuoteSchema = z.object({
  totals: orderTotalsSchema,
  deliveryOptions: z.array(deliveryOptionSchema).min(1),
  paymentMethods: z.array(paymentMethodSchema).min(1),
  /** Whether gift wrapping is offered, and what it costs (§28.2). */
  gift: z.object({ isOffered: z.boolean(), chargeMinor: z.number().int().nonnegative() }),
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
  contactName: z.string().trim().min(2),
  /*
   * D5 — the national mobile format is client configuration, not a domain
   * constant. `CLIENT.market.mobile` is the one place it is written, so a
   * deployment in another market changes a regex rather than a component.
   */
  contactMobile: z.string().trim().regex(CLIENT.market.mobile.pattern),
  /** Optional: this market reaches customers by mobile, not by email. */
  contactEmail: z.union([z.email(), z.literal('')]),
  addressLine: z.string().trim().min(6),
  addressCity: z.string().trim().min(2),
  deliveryOptionId: z.string().min(1),
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

export const orderSchema = z.object({
  id: orderIdSchema,
  /** What the customer quotes on the phone if they call about the order. */
  orderNumber: z.string().min(1),
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
});

export type Order = z.infer<typeof orderSchema>;

/**
 * §7.2's outcomes, as a discriminated union (TS-06).
 *
 * Two of these are not errors and must not be rendered as one — they are the
 * transaction doing exactly what §7.2 says:
 *
 * - **`RESERVATION_EXPIRED`** — step 1. "ROLLBACK and return the customer to
 *   the bag naming the expired items." So the names travel with it.
 * - **`PRICE_CHANGED`** — step 2. "Prices are never silently changed under a
 *   customer at payment." The new totals come back for explicit confirmation,
 *   and the customer re-submits or leaves.
 */
export const placeOrderResultSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('PLACED'), order: orderSchema }),
  z.object({
    kind: z.literal('RESERVATION_EXPIRED'),
    expiredItems: z.array(z.string().min(1)).min(1),
  }),
  z.object({ kind: z.literal('PRICE_CHANGED'), totals: orderTotalsSchema }),
  /** §7.2 step 7: authorisation failed after commit, so the order was cancelled. */
  z.object({ kind: z.literal('PAYMENT_FAILED'), reason: z.string().min(1) }),
]);

export type PlaceOrderResult = z.infer<typeof placeOrderResultSchema>;

/**
 * What the customer's browser sends to place an order.
 *
 * `expectedTotalMinor` is what makes §7.2 step 2 possible. The backend compares
 * it against a fresh re-price and refuses if they differ, which is the whole
 * mechanism behind "prices are never silently changed under a customer".
 */
export const placeOrderRequestSchema = checkoutFormSchema.extend({
  expectedTotalMinor: z.number().int().nonnegative(),
});

export type PlaceOrderRequest = z.infer<typeof placeOrderRequestSchema>;
