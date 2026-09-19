import { z } from 'zod';

import { orderNumberSchema } from '@/lib/domain/ids';

/**
 * SSOT-09 — §28.3's order history, one PAGE at a time.
 *
 * The first version of this contract returned every order in one list, bounded
 * at 500. Below the bound a page rendered hundreds of rows, which PERF-03 forbids;
 * above it the parse failed, and a long-standing customer's history would have
 * read as "we could not reach your orders" for good, with nothing they could do.
 * Split out of `checkout.schema.ts`, which was at its MOD-03 ceiling.
 *
 * The request is `GET ENDPOINTS.account.orders?limit=&cursor=`: `limit` from 1 to
 * `ACCOUNT_ORDERS_PAGE_MAX`, and `cursor` the `nextCursor` of the page before, or
 * absent for the newest orders.
 */

/** The most orders one page may carry — PERF-03's ~100 rows, stated on the wire. */
export const ACCOUNT_ORDERS_PAGE_MAX = 100;

/**
 * One row per order, and no more than a row.
 *
 * Deliberately NOT `orderSchema`. A list needs enough to recognise an order and
 * follow it; the order page already holds every snapshotted line and piece, and
 * shipping all of them to draw a date and a total would put a customer's whole
 * purchase history on the wire for a summary.
 *
 * It is a LIST and not tracking. Order tracking is out of the MVP by operator
 * decision, so nothing here carries a status, and no wording implies one.
 */
export const accountOrderSchema = z.object({
  orderNumber: orderNumberSchema,
  placedAt: z.iso.datetime(),
  totalMinor: z.number().int().nonnegative(),
  /** How many PRODUCTS, because that is what "and 2 more" counts. */
  lineCount: z.number().int().nonnegative(),
  /** The first line's name AS IT WAS — what makes an order recognisable. */
  firstItem: z.string(),
});

/**
 * Where the next page starts. OPAQUE: its meaning is the backend's (DATA-13), so
 * nothing here reads it — it is only handed back. It travels through the address
 * bar as well, so it is held to a short, URL-safe shape either way (SEC-02).
 */
export const orderHistoryCursorSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);

export const accountOrdersSchema = z.object({
  /* SEC-02 — a served list is untrusted input however friendly the sender looks,
     and the bound is the most any request may ask for. */
  orders: z.array(accountOrderSchema).max(ACCOUNT_ORDERS_PAGE_MAX),
  /** `null` when this page reaches the oldest order. */
  nextCursor: orderHistoryCursorSchema.nullable(),
});

export type AccountOrder = z.infer<typeof accountOrderSchema>;
export type AccountOrders = z.infer<typeof accountOrdersSchema>;

/** One page of the history, as asked for. */
export interface AccountOrdersPage {
  readonly limit: number;
  /** `null` for the newest orders. */
  readonly cursor: string | null;
}
