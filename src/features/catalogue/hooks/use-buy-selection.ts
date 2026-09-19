'use client';

import { useState } from 'react';

import type { PieceId, SizeId } from '@/lib/domain/ids';

import { hasAnySize, prefilledSelection, type StatusOf } from '../lib/saved-size-prefill';
import {
  applyUnifiedSize,
  isSelectionComplete,
  setPieceSize,
  sizeStatus,
  type SizeSelection,
} from '../lib/size-selection';
import type { ProductDetailAvailability } from '../schemas/piece-availability.schema';
import type { ProductDetail } from '../schemas/product-detail.schema';

export interface BuySelection {
  readonly selection: SizeSelection;
  /** The saved sizes chose what is chosen, and the customer has not chosen since. */
  readonly isPrefilled: boolean;
  /** Every piece that has sizes has an available one (§16's first invariant). */
  readonly isComplete: boolean;
  readonly chooseUnified: (sizeId: SizeId) => void;
  readonly choosePiece: (pieceId: PieceId, sizeId: SizeId) => void;
}

/**
 * MOD-05 layer 2 — the buy box's size choice, and where §28.3's pre-fill meets it.
 *
 * STATE-03: the pre-filled choice is DERIVED, never copied into state. Until the
 * customer presses a size, the selection IS the one the saved sizes give. They are
 * read in the browser and land a moment after the page, so a copy taken at mount
 * would miss them, and an effect copying them in later would be STATE-04's
 * prohibited sync — one that could overwrite a size chosen in between. Derived,
 * the first press belongs to the customer and nothing arriving later can undo it.
 *
 * STATE-01 rung 2: a half-made size choice is not shareable, bookmarkable or
 * back-button-relevant, so it stays local rather than going in the URL.
 *
 * A sold-out pair cannot be selected. When the overlay is unreadable every status
 * is `null`, which is NOT sold out — the page degrades to letting the customer
 * choose rather than refusing every size (§30.2).
 */
export function useBuySelection(
  product: ProductDetail,
  availability: ProductDetailAvailability | null,
  savedSizeIds: readonly SizeId[],
): BuySelection {
  const [chosen, setChosen] = useState<SizeSelection | null>(null);
  const statusOf: StatusOf = (pieceId, sizeId) => sizeStatus(availability, pieceId, sizeId);
  const isSelectable = (pieceId: PieceId, sizeId: SizeId): boolean =>
    statusOf(pieceId, sizeId) !== 'SOLD_OUT';

  const prefilled = prefilledSelection(product, savedSizeIds, statusOf);
  const selection = chosen ?? prefilled;

  return {
    selection,
    isPrefilled: chosen === null && hasAnySize(prefilled),
    isComplete: isSelectionComplete(product, selection, isSelectable),
    // A press starts from what the customer SEES, pre-filled sizes included.
    chooseUnified: (sizeId) => {
      setChosen((current) => applyUnifiedSize(product, current ?? prefilled, sizeId, isSelectable));
    },
    choosePiece: (pieceId, sizeId) => {
      setChosen((current) => setPieceSize(current ?? prefilled, pieceId, sizeId));
    },
  };
}
