import { DEFAULT_LOCALE, type Locale } from '@/i18n/locales';

import { productAvailabilityFor } from './availability-db';
import { contactEmailFor } from './auth-db';

/**
 * D1 — §28.2's "Sold-out sizes with Notify Me", standing in for Java.
 *
 * It RECORDS a request and does nothing else. The email that answers it is
 * §28.7's back-in-stock message, sent by §23 Notifications when stock returns;
 * no mail provider is wired up here, so nothing is sent, and nothing in the
 * storefront says it has been.
 *
 * Three rules make it more than a list:
 *
 * - **Availability is asked, not assumed** (DATA-13). A size the live ledger
 *   says can be bought is refused as `IN_STOCK` — the overlay the page was
 *   rendered with can be minutes old — and a product, piece or size the store
 *   does not sell is a 404.
 * - **The address comes from the account when there is one.** The account
 *   arrives as a header the BFF attached from the session; a typed address in
 *   the body is used only when that account has none on file, or there is no
 *   account. A typed address is never looked up against the accounts, so a
 *   guest typing a customer's address gets exactly the answer any other address
 *   would (§11's "never reveal whether an account exists").
 * - **Asking twice is idempotent and says so.** One row per
 *   `(address, product, piece, size)`; a repeat adds nothing and answers
 *   `ALREADY_RECORDED`.
 *
 * D6 — append-only. A row is never removed or rewritten. When the backend
 * sends the email it settles the request by STATUS and keeps the row; a later
 * request for the same size then starts a new one. That settling is not
 * modelled, because nothing here sends.
 */

export interface BackInStockAsk {
  readonly productId: string;
  /** `null` asks about the product as a whole in this size. */
  readonly pieceId: string | null;
  readonly sizeId: string;
  /** Typed by a guest, or by an account with no address on file. */
  readonly email: string | null;
  /** From the header the BFF attached; never from the body. */
  readonly accountKey: string | null;
  /** The language the email is to be written in (§23). */
  readonly locale: Locale;
}

export type BackInStockAnswer =
  | { readonly kind: 'RECORDED' }
  | { readonly kind: 'ALREADY_RECORDED' }
  | { readonly kind: 'IN_STOCK' }
  | { readonly kind: 'EMAIL_REQUIRED' };

interface BackInStockRow {
  readonly productId: string;
  readonly pieceId: string;
  readonly sizeId: string;
  /** Lower-cased and trimmed, so one mailbox is one requester. */
  readonly email: string;
  /** Who asked, when somebody was signed in. Provenance only — not part of the key. */
  readonly accountKey: string | null;
  readonly locale: Locale;
  readonly recordedAt: string;
}

const REQUESTS: BackInStockRow[] = [];

const normalised = (email: string): string => email.trim().toLowerCase();

/**
 * The pieces a request is about, each with its live status in the size — or
 * `null` when the store does not sell that product, piece or size.
 */
function piecesAskedAbout(
  ask: BackInStockAsk,
): { readonly pieceId: string; readonly isSoldOut: boolean }[] | null {
  const availability = productAvailabilityFor(ask.productId, DEFAULT_LOCALE);
  if (availability === null) return null;

  const pieces = availability.pieces.flatMap((piece) => {
    if (ask.pieceId !== null && piece.pieceId !== ask.pieceId) return [];
    const size = piece.sizes.find((entry) => entry.sizeId === ask.sizeId);
    return size === undefined
      ? []
      : [{ pieceId: piece.pieceId, isSoldOut: size.status === 'SOLD_OUT' }];
  });

  return pieces.length === 0 ? null : pieces;
}

/** The account's own address when it has one; otherwise whatever was typed. */
function recipientOf(ask: BackInStockAsk): string | null {
  const accountEmail = ask.accountKey === null ? null : contactEmailFor(ask.accountKey);
  const email = accountEmail ?? ask.email;
  return email === null || email.trim().length === 0 ? null : normalised(email);
}

/**
 * Records a request to be emailed when a sold-out size is back, or `null` when
 * the store does not sell what was named (Java's 404).
 *
 * For a request about the whole product (`pieceId: null`), the pieces recorded
 * are the ones sold out in that size — the set rule is the backend's (§16) — and
 * the answer is `IN_STOCK` only when none of them is.
 */
export function requestBackInStock(
  ask: BackInStockAsk,
  now: Date = new Date(),
): BackInStockAnswer | null {
  const pieces = piecesAskedAbout(ask);
  if (pieces === null) return null;

  const soldOut = pieces.filter((piece) => piece.isSoldOut);
  if (soldOut.length === 0) return { kind: 'IN_STOCK' };

  const email = recipientOf(ask);
  if (email === null) return { kind: 'EMAIL_REQUIRED' };

  const fresh = soldOut.filter(
    (piece) =>
      !REQUESTS.some(
        (row) =>
          row.email === email &&
          row.productId === ask.productId &&
          row.pieceId === piece.pieceId &&
          row.sizeId === ask.sizeId,
      ),
  );

  for (const piece of fresh) {
    REQUESTS.push({
      productId: ask.productId,
      pieceId: piece.pieceId,
      sizeId: ask.sizeId,
      email,
      accountKey: ask.accountKey,
      locale: ask.locale,
      recordedAt: now.toISOString(),
    });
  }

  return fresh.length === 0 ? { kind: 'ALREADY_RECORDED' } : { kind: 'RECORDED' };
}

/**
 * Every request on file for one address — D6's record.
 *
 * There is deliberately no reset beside it: the store has no way to forget a
 * row, and a test seam that could would be a second, softer definition of what
 * it does. Tests isolate themselves with distinct addresses, as the saved items'
 * do with distinct accounts.
 */
export function backInStockRequestsFor(email: string): readonly BackInStockRow[] {
  return REQUESTS.filter((row) => row.email === normalised(email));
}
