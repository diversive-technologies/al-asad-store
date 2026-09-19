import { z } from 'zod';

import { pieceIdSchema, productIdSchema, sizeIdSchema } from '@/lib/domain/ids';

/**
 * SSOT-09 — §28.2's "Sold-out sizes with Notify Me", as the wire contract.
 *
 * What the customer asks for is an EMAIL: §28.4 and §28.7 list back-in-stock
 * among Release 1's notifications, and §28.7 says no other message is sent. So
 * this contract records a request and nothing else. Sending the email when the
 * size is back is the backend's job, done by §23 Notifications, and nothing in
 * the storefront waits for it or claims it has happened.
 *
 * A request is keyed on `(product, piece, size)` — §13 keys stock on
 * `(piece, size)`, and the product is what the customer was looking at. Whether
 * that pair is sold out is the backend's answer (DATA-13): the interface only
 * offers the request on a size the overlay reported sold out, and the backend
 * checks again and says `IN_STOCK` when it is not.
 */

/**
 * RFC 5321's ceiling on a whole address, and the SEC-02 bound: the length of a
 * typed field is untrusted input. No address anybody can receive mail at is
 * longer, so this refuses nothing a customer would type.
 */
export const MAX_EMAIL_LENGTH = 254;

/** Trimmed first, so a pasted address with a stray space is not refused for it. */
export const notifyEmailSchema = z.string().trim().max(MAX_EMAIL_LENGTH).pipe(z.email());

export const backInStockRequestSchema = z.object({
  productId: productIdSchema,
  /**
   * `null` asks about the PRODUCT in this size — a SIMPLE product's one
   * selector, and a SET's unified one. Which pieces that means is the backend's
   * to settle (§16 knows a set is a set), so the interface does not scan the
   * overlay to list them. A piece id asks about that piece alone: the per-piece
   * override panel.
   */
  pieceId: pieceIdSchema.nullable(),
  sizeId: sizeIdSchema,
  /**
   * A GUEST's address, typed. `null` for a signed-in customer: the backend
   * writes to the address on the account, which it resolves from the session
   * the BFF forwards — never from this body — and ignores this field whenever
   * the account has one. An account with no address on file (a customer who
   * signed in by code) sends one here instead.
   */
  email: notifyEmailSchema.nullable(),
});

export type BackInStockRequest = z.infer<typeof backInStockRequestSchema>;

/**
 * Every answer the backend gives to a well-formed request for a size it sells.
 * None of them is an error, so all of them arrive as a 200 with a `kind`:
 *
 * - `RECORDED` — a new request is on file.
 * - `ALREADY_RECORDED` — this address already asked about this size, and nothing
 *   was added. Asking twice is idempotent and SAYS so.
 * - `IN_STOCK` — the size can be bought now, so there is nothing to wait for and
 *   nothing was recorded.
 * - `EMAIL_REQUIRED` — there is no address to write to: a guest who sent none,
 *   or an account with none on file.
 *
 * No answer echoes an address, and none differs by whether an address belongs to
 * an account: a guest typing a customer's address is answered exactly as for
 * any other address.
 */
export const BACK_IN_STOCK_OUTCOMES = [
  'RECORDED',
  'ALREADY_RECORDED',
  'IN_STOCK',
  'EMAIL_REQUIRED',
] as const;

export const backInStockOutcomeSchema = z.object({
  kind: z.enum(BACK_IN_STOCK_OUTCOMES),
});

export type BackInStockOutcome = z.infer<typeof backInStockOutcomeSchema>;

/** FORM-01 — the guest's one field, validated by the rule the contract states. */
export const backInStockEmailFormSchema = z.object({ email: notifyEmailSchema });

export type BackInStockEmailInput = z.infer<typeof backInStockEmailFormSchema>;
