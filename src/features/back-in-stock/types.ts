import type { PieceId, ProductId, SizeId } from '@/lib/domain/ids';

/**
 * Why a Notify Me press did not come back with an answer from the backend.
 *
 * `INVALID` — the address was refused (a 400); it goes back on the field.
 * `NOT_OFFERED` — the store no longer sells that size (a 404), so the page is out
 * of date. `UNREACHABLE` — anything else, which the customer can only retry.
 *
 * Not a wire shape, so not a schema (SSOT-09): it is what our own BFF's statuses
 * mean to the page, and the pure words module needs it without the fetch.
 */
export interface BackInStockError {
  readonly kind: 'INVALID' | 'NOT_OFFERED' | 'UNREACHABLE';
}

/** A size the overlay reported sold out, as the selector names it. */
export interface SoldOutSize {
  readonly id: SizeId;
  readonly label: string;
}

/**
 * What a group of sizes on the product page is about: the product as a whole (a
 * SIMPLE product's one selector, a SET's unified one), or one piece of it (the
 * per-piece override panel).
 */
export interface BackInStockTarget {
  readonly productId: ProductId;
  readonly productName: string;
  readonly piece: { readonly id: PieceId; readonly name: string } | null;
}
