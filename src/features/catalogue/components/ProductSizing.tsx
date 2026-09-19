'use client';

import type { ReactNode } from 'react';

import { useMessages } from '@/i18n/use-messages';
import type { PieceId, SizeId } from '@/lib/domain/ids';

import { savedSizeIn } from '../lib/saved-size-prefill';
import {
  sharedSizesOf,
  sizeStatus,
  unifiedSizeOf,
  unifiedSizeStatus,
  type SizeSelection,
} from '../lib/size-selection';
import type { ProductDetailAvailability } from '../schemas/piece-availability.schema';
import type { ProductDetail } from '../schemas/product-detail.schema';
import { PerPieceSizing } from './PerPieceSizing';
import { SizeGroup } from './SizeGroup';
import { SizeGuide } from './SizeGuide';

export interface ProductSizingProps {
  product: ProductDetail;
  availability: ProductDetailAvailability | null;
  selection: SizeSelection;
  /** §28.3 — the customer's saved sizes, marked wherever a selector offers one. */
  savedSizeIds: readonly SizeId[];
  onUnified: (sizeId: SizeId) => void;
  onPiece: (pieceId: PieceId, sizeId: SizeId) => void;
  /** §28.2's size guide, as a slot from the route; `null` offers none. */
  sizeGuide: ReactNode;
}

/**
 * The one place the SIMPLE/SET distinction is visible (§28.2): "A SIMPLE product
 * shows one size selector and nothing else; a SET shows the unified selector
 * plus the per-piece override panel." The branch reads the DECLARED `type`
 * (DATA-13a) — never `pieces.length`.
 *
 * The single piece of a SIMPLE product is addressed directly rather than through
 * the unified helper, because "unified" across one piece is just that piece. The
 * per-piece panel lists every piece, one-size ones included — `SizeSelector`
 * renders nothing for those, and a piece with no size to choose has nothing to
 * override.
 *
 * §28.2's size guide is offered on the line of the selector the customer is
 * deciding with: the one selector of a SIMPLE product, and on a SET the unified
 * selector and the per-piece panel's heading. Not once per piece — it is one guide
 * for the whole garment, and four identical buttons down a three-piece suit would
 * be the same offer made four times.
 *
 * §28.2's Notify Me sits under every selector with a sold-out size (`SizeGroup`),
 * and asks about what that selector sells: the PRODUCT in that size under a SIMPLE
 * product's selector and a SET's unified one — which pieces that means is the
 * backend's to settle — and one piece under the per-piece panel.
 *
 * A SET's unified selector offers only the sizes every piece is made in, and
 * calls one sold out when ANY piece is (`sharedSizesOf`, `unifiedSizeStatus`) —
 * the card quick add's rule — so its radios, its Notify Me and the §7.1 add agree.
 *
 * §28.3's saved size is MARKED on every selector that offers it, chosen or not, so
 * a customer who picks something else can still see which size is theirs. The
 * words come from `useMessages()`, which keeps this within CMP-06's seven props.
 */
export function ProductSizing({
  product,
  availability,
  selection,
  savedSizeIds,
  onUnified,
  onPiece,
  sizeGuide,
}: ProductSizingProps) {
  const t = useMessages().product;
  const sizeableFirst = product.pieces.find((piece) => piece.sizes.length > 0);
  const guide = sizeGuide === null ? null : <SizeGuide content={sizeGuide} />;
  const wholeProduct = { productId: product.id, productName: product.name, piece: null };

  if (product.type === 'SIMPLE') {
    return sizeableFirst === undefined ? null : (
      <SizeGroup
        target={wholeProduct}
        selector={{
          legend: t.selectSizeHeading,
          groupId: sizeableFirst.id,
          sizes: sizeableFirst.sizes,
          choice: {
            selected: selection[sizeableFirst.id] ?? null,
            saved: savedSizeIn(sizeableFirst.sizes, savedSizeIds),
          },
          onSelect: (sizeId) => {
            onPiece(sizeableFirst.id, sizeId);
          },
          statusOf: (sizeId) => sizeStatus(availability, sizeableFirst.id, sizeId),
          legendAction: guide,
        }}
      />
    );
  }

  // A unified size is applied to EVERY piece, so it is judged across all of them.
  const unifiedSizes = sharedSizesOf(product);

  return (
    <>
      <SizeGroup
        target={wholeProduct}
        selector={{
          legend: t.unifiedSizeHeading,
          groupId: 'unified',
          sizes: unifiedSizes,
          choice: {
            selected: unifiedSizeOf(product, selection),
            saved: savedSizeIn(unifiedSizes, savedSizeIds),
          },
          onSelect: onUnified,
          statusOf: (sizeId) => unifiedSizeStatus(product, availability, sizeId),
          legendAction: guide,
        }}
      />

      <PerPieceSizing
        product={product}
        availability={availability}
        selection={selection}
        savedSizeIds={savedSizeIds}
        onPiece={onPiece}
        heading={t.perPieceHeading}
        guide={guide}
      />
    </>
  );
}
