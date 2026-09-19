import { z } from 'zod';

import { orderAccessTokenSchema } from '@/lib/domain/ids';

import { checkoutFormSchema, orderSchema, orderTotalsSchema } from './checkout.schema';

/**
 * SSOT-09 — §17 `place(...)`: what placing an order sends, and every answer it
 * gets. Split out of `checkout.schema.ts` when the order's access token took that
 * file past MOD-03's 300-line ceiling; the seam is the one the contract already
 * had, between what an order IS and how one is placed.
 */

/**
 * What the customer's browser sends to place an order.
 *
 * `expectedTotalMinor` is what makes §7.2 step 2 possible. The backend compares
 * it against a fresh re-price and refuses if they differ, which is the whole
 * mechanism behind "prices are never silently changed under a customer".
 *
 * `deliveryOptionId` travels beside it from the SAME quote: the option that total
 * was priced with, never one the page assumed.
 */
export const placeOrderRequestSchema = checkoutFormSchema.extend({
  deliveryOptionId: z.string().min(1),
  expectedTotalMinor: z.number().int().nonnegative(),
});

export type PlaceOrderRequest = z.infer<typeof placeOrderRequestSchema>;

const placedSchema = z.object({ kind: z.literal('PLACED'), order: orderSchema });

/* Every answer but PLACED, named once so the browser's union and the backend's
   cannot drift apart on what a refusal carries. */
const refusalSchemas = [
  z.object({
    kind: z.literal('RESERVATION_EXPIRED'),
    expiredItems: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    kind: z.literal('MEASUREMENTS_CHANGED'),
    restitchedItems: z.array(z.string().min(1)).min(1),
  }),
  z.object({ kind: z.literal('PRICE_CHANGED'), totals: orderTotalsSchema }),
  /** §7.2 step 7: authorisation failed after commit, so the order was cancelled. */
  z.object({ kind: z.literal('PAYMENT_FAILED'), reason: z.string().min(1) }),
] as const;

/**
 * §7.2's outcomes, as a discriminated union (TS-06) — what the BROWSER is told.
 *
 * Two of these are not errors and must not be rendered as one — they are the
 * transaction doing exactly what §7.2 says:
 *
 * - **`RESERVATION_EXPIRED`** — step 1. "ROLLBACK and return the customer to
 *   the bag naming the expired items." So the names travel with it.
 * - **`PRICE_CHANGED`** — step 2. "Prices are never silently changed under a
 *   customer at payment." The new totals come back for explicit confirmation,
 *   and the customer re-submits or leaves.
 * - **`MEASUREMENTS_CHANGED`** — §34.7's equivalent for cloth. A garment to be
 *   cut names the measurements it was added against; saving them again with
 *   anything changed mints a new version, and cutting to figures the customer
 *   never confirmed is the one mistake this whole feature exists to avoid. The
 *   garments are named, for the reason §7.1 names the piece that failed.
 */
export const placeOrderResultSchema = z.discriminatedUnion('kind', [
  placedSchema,
  ...refusalSchemas,
]);

export type PlaceOrderResult = z.infer<typeof placeOrderResultSchema>;

/**
 * The same answers as the BACKEND gives them to the BFF: a placed order arrives
 * with an ACCESS TOKEN for reading it back (§28.3).
 *
 * The order's number runs in sequence, so the number alone must never read an
 * order — it would hand anyone who counts the name, address and measurements
 * behind it. The BFF keeps this token in an httpOnly cookie and strips it before
 * the browser sees the answer, which is why the browser's union above has none.
 */
export const placeOrderReplySchema = z.discriminatedUnion('kind', [
  placedSchema.extend({ accessToken: orderAccessTokenSchema }),
  ...refusalSchemas,
]);

export type PlaceOrderReply = z.infer<typeof placeOrderReplySchema>;
