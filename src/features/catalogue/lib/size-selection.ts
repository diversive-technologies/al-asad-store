import type { PieceId, SizeId } from '@/lib/domain/ids';

import type { AvailabilityStatus } from '../schemas/availability.schema';
import type { ProductDetailAvailability } from '../schemas/piece-availability.schema';
import type { Piece, ProductDetail, SizeOption } from '../schemas/product-detail.schema';

/**
 * MOD-04 — pure, React-free. The size-selection rules of §28.2, kept out of the
 * buy box so they can be tested without rendering anything.
 *
 * §6.1 is the shape this implements: storage is uniform and behaviour is
 * explicit. A SIMPLE product has one piece, a SET has several, and the SAME
 * selection map serves both — `Record<PieceId, SizeId | null>`. What changes
 * between them is which controls are drawn, and that branches on the DECLARED
 * `type` (DATA-13a), never on how many entries this map happens to hold.
 */

/** One chosen size per piece. `null` means the customer has not chosen yet. */
export type SizeSelection = Readonly<Record<string, SizeId | null>>;

/** What a rule that only compares sizes reads of a product: each piece and its sizes. */
export interface SizedProduct {
  readonly pieces: readonly Pick<Piece, 'id' | 'sizes'>[];
}

/**
 * Whether a `(piece, size)` pair can be chosen at all.
 *
 * Passed in rather than read here, because availability is a LIVE answer from
 * the backend and this module is pure. The caller supplies it from the overlay;
 * when the overlay could not be read every pair is treated as selectable, which
 * is the honest fallback — refusing selections because we could not check would
 * turn a degraded overlay into a broken page (§30.2).
 */
export type IsSelectable = (pieceId: PieceId, sizeId: SizeId) => boolean;

const ALWAYS_SELECTABLE: IsSelectable = () => true;

export function initialSelection(product: ProductDetail): SizeSelection {
  return Object.fromEntries(
    // A one-size piece has no sizes to choose, and is complete from the start.
    product.pieces.map((piece) => [piece.id, null]),
  );
}

export function setPieceSize(
  selection: SizeSelection,
  pieceId: PieceId,
  sizeId: SizeId,
): SizeSelection {
  return { ...selection, [pieceId]: sizeId };
}

/**
 * The unified selector of §28.2: one choice applied across the set.
 *
 * A piece that does not offer the chosen size keeps whatever it had. That is
 * the honest reading of "unified" — the dupatta with no size set is not made
 * wrong by the customer picking M for the shirt, and forcing a size onto a piece
 * that has none would put an id in the map that Inventory cannot key on.
 */
export function applyUnifiedSize(
  product: ProductDetail,
  selection: SizeSelection,
  sizeId: SizeId,
  isSelectable: IsSelectable = ALWAYS_SELECTABLE,
): SizeSelection {
  const next: Record<string, SizeId | null> = { ...selection };

  for (const piece of product.pieces) {
    if (!piece.sizes.some((size) => size.id === sizeId)) continue;
    /*
     * A sold-out size is skipped rather than assigned. Picking "M for the whole
     * set" when the trouser's M is gone must not quietly put an unbuyable pair
     * in the selection — that piece stays unchosen, the selection stays
     * incomplete, and the customer is told to choose rather than led to a
     * reservation that Inventory would refuse (§7.1).
     */
    if (!isSelectable(piece.id, sizeId)) continue;

    next[piece.id] = sizeId;
  }

  return next;
}

/**
 * The size shared by every sizeable piece, or `null` when they differ.
 *
 * STATE-03: this is derived rather than stored. Keeping a separate "unified
 * size" alongside the per-piece map would be a second source of truth for one
 * fact, and the two would disagree the moment a piece was overridden.
 */
export function unifiedSizeOf(product: SizedProduct, selection: SizeSelection): SizeId | null {
  const sizeable = product.pieces.filter((piece) => piece.sizes.length > 0);
  if (sizeable.length === 0) return null;

  const first = selection[sizeable[0]?.id ?? ''] ?? null;
  if (first === null) return null;

  return sizeable.every((piece) => selection[piece.id] === first) ? first : null;
}

/**
 * The sizes a SET's unified selector offers: the ones EVERY sized piece is made
 * in, in the order the first of them lists them.
 *
 * A unified size is one size applied to every piece (§28.2), so a size that one
 * piece is not made in is not a size the whole set comes in. It is the card's
 * quick-add rule as well (`unifiedSizesFor`), so the tile and the page offer the
 * same sizes for one product.
 */
export function sharedSizesOf(product: SizedProduct): SizeOption[] {
  const [first, ...rest] = product.pieces.filter((piece) => piece.sizes.length > 0);
  if (first === undefined) return [];

  return first.sizes.filter((size) =>
    rest.every((piece) => piece.sizes.some((entry) => entry.id === size.id)),
  );
}

/**
 * The status of ONE size applied to every sized piece: what the unified selector
 * shows, what its Notify Me is offered on, and what the §7.1 add will accept.
 *
 * Sold out when ANY piece is reported sold out in it, because the add reserves
 * every piece and one row it cannot reserve refuses the whole add. It used to be
 * read from the first piece alone, so a set whose shalwar was gone in M offered
 * M as buyable — a radio that chose part of the set and an add that could not go
 * in. Unknown when nothing is sold out but a piece could not be read (§30.2:
 * unknown is neither sold out nor in stock); low when any piece is low.
 *
 * It combines statuses the backend REPORTED per `(piece, size)` and computes no
 * stock of its own (DATA-13).
 */
export function unifiedSizeStatus(
  product: SizedProduct,
  availability: ProductDetailAvailability | null,
  sizeId: SizeId,
): AvailabilityStatus | null {
  const statuses = product.pieces
    .filter((piece) => piece.sizes.length > 0)
    .map((piece) => sizeStatus(availability, piece.id, sizeId));

  if (statuses.includes('SOLD_OUT')) return 'SOLD_OUT';
  if (statuses.length === 0 || statuses.includes(null)) return null;
  return statuses.includes('LOW_STOCK') ? 'LOW_STOCK' : 'IN_STOCK';
}

/** Every piece that CAN be sized has been. One-size pieces need no choice. */
export function isSelectionComplete(
  product: ProductDetail,
  selection: SizeSelection,
  isSelectable: IsSelectable = ALWAYS_SELECTABLE,
): boolean {
  return product.pieces.every((piece) => {
    if (piece.sizes.length === 0) return true;

    const chosen = selection[piece.id] ?? null;
    // A chosen size that has since sold out does not count as chosen.
    return chosen !== null && isSelectable(piece.id, chosen);
  });
}

/**
 * The `{piece -> size}` pairs an add sends (§16), from the choices made.
 *
 * A piece with a chosen size sends it. A one-size piece has no size to name, so
 * it sends nothing rather than an empty id — whether a line may exist without
 * one is the backend's rule to apply (DATA-13), not a value to invent here.
 */
export function bagSelectionsOf(
  product: ProductDetail,
  selection: SizeSelection,
): { pieceId: PieceId; sizeId: SizeId }[] {
  return product.pieces.flatMap((piece) => {
    const sizeId = selection[piece.id] ?? null;
    return sizeId === null ? [] : [{ pieceId: piece.id, sizeId }];
  });
}

/**
 * The sizes of one selector the overlay REPORTED sold out, in the order they are
 * drawn — what §28.2's Notify Me is offered on.
 *
 * It reads the status the selector itself shows, and decides nothing: a size
 * whose status is unknown is not sold out (§30.2), so a page whose overlay could
 * not be read offers no Notify Me rather than offering it on every size.
 */
export function soldOutSizes<TSize extends { readonly id: SizeId }>(
  sizes: readonly TSize[],
  statusOf: (sizeId: SizeId) => AvailabilityStatus | null,
): TSize[] {
  return sizes.filter((size) => statusOf(size.id) === 'SOLD_OUT');
}

/**
 * The backend's status for one `(piece, size)` pair, or `null` when it is not
 * known.
 *
 * `null` is a real answer, not a default. §30.2 lets the overlay fail without
 * taking the page down, and an unknown status must not be rendered as "in
 * stock" — claiming a size is buyable when nobody asked is exactly the guess
 * DATA-13a forbids.
 */
export function sizeStatus(
  availability: ProductDetailAvailability | null,
  pieceId: PieceId,
  sizeId: SizeId,
): AvailabilityStatus | null {
  const piece = availability?.pieces.find((entry) => entry.pieceId === pieceId);
  return piece?.sizes.find((size) => size.sizeId === sizeId)?.status ?? null;
}
