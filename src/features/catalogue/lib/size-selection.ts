import type { PieceId, SizeId } from '@/lib/domain/ids';

import type { AvailabilityStatus } from '../schemas/availability.schema';
import type { ProductDetailAvailability } from '../schemas/piece-availability.schema';
import type { ProductDetail } from '../schemas/product-detail.schema';

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
export function unifiedSizeOf(product: ProductDetail, selection: SizeSelection): SizeId | null {
  const sizeable = product.pieces.filter((piece) => piece.sizes.length > 0);
  if (sizeable.length === 0) return null;

  const first = selection[sizeable[0]?.id ?? ''] ?? null;
  if (first === null) return null;

  return sizeable.every((piece) => selection[piece.id] === first) ? first : null;
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
