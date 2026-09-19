import type { ReactNode } from 'react';

import type { PieceId, SizeId } from '@/lib/domain/ids';

import { savedSizeIn } from '../lib/saved-size-prefill';
import { sizeStatus, type SizeSelection } from '../lib/size-selection';
import type { ProductDetailAvailability } from '../schemas/piece-availability.schema';
import type { ProductDetail } from '../schemas/product-detail.schema';
import { SizeGroup } from './SizeGroup';

export interface PerPieceSizingProps {
  product: ProductDetail;
  availability: ProductDetailAvailability | null;
  selection: SizeSelection;
  /** §28.3 — each piece marks the saved size it is made in, if it is made in one. */
  savedSizeIds: readonly SizeId[];
  onPiece: (pieceId: PieceId, sizeId: SizeId) => void;
  heading: string;
  /** §28.2's size guide control, on the panel's heading line; `null` offers none. */
  guide: ReactNode;
}

/**
 * A SET's per-piece override panel (§28.2): every piece, each with its own size
 * selector, and each piece's sold-out sizes asked about for THAT piece alone.
 *
 * Split out of `ProductSizing` when Notify Me joined every selector and took that
 * function past MOD-03's 60-line body.
 */
export function PerPieceSizing({
  product,
  availability,
  selection,
  savedSizeIds,
  onPiece,
  heading,
  guide,
}: PerPieceSizingProps) {
  return (
    <div className="border-border flex flex-col gap-4 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        {/* A11Y-09: the buy box sits under the product's h1, so this is an h2. */}
        <h2 className="text-fg-muted text-sm font-medium">{heading}</h2>
        {guide}
      </div>

      {product.pieces.map((piece) => (
        <SizeGroup
          key={piece.id}
          target={{
            productId: product.id,
            productName: product.name,
            piece: { id: piece.id, name: piece.name },
          }}
          selector={{
            legend: piece.name,
            groupId: piece.id,
            sizes: piece.sizes,
            choice: {
              selected: selection[piece.id] ?? null,
              saved: savedSizeIn(piece.sizes, savedSizeIds),
            },
            onSelect: (sizeId) => {
              onPiece(piece.id, sizeId);
            },
            statusOf: (sizeId) => sizeStatus(availability, piece.id, sizeId),
          }}
        />
      ))}
    </div>
  );
}
