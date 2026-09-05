'use client';

import { useState } from 'react';

import { AddToBagButton } from '@/features/bag/contract';
import type { PieceId, SizeId } from '@/lib/domain/ids';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatMoneyMinor } from '@/lib/utils/format';

import {
  applyUnifiedSize,
  initialSelection,
  isSelectionComplete,
  setPieceSize,
  sizeStatus,
  unifiedSizeOf,
} from '../lib/size-selection';
import type { ProductDetailAvailability } from '../schemas/piece-availability.schema';
import type { ProductDetail } from '../schemas/product-detail.schema';
import { SizeSelector } from './SizeSelector';

export interface ProductBuyBoxProps {
  product: ProductDetail;
  /** `null` when the live overlay could not be read (§30.2). */
  availability: ProductDetailAvailability | null;
  locale: Locale;
  messages: Messages;
}

/**
 * §28.2's buy box, and the one place the SIMPLE/SET distinction is visible.
 *
 * "A SIMPLE product shows one size selector and nothing else; a SET shows the
 * unified selector plus the per-piece override panel." That branch reads the
 * DECLARED `product.type` (DATA-13a) — never `pieces.length`. §6.1 is explicit
 * that a SIMPLE product still has one Piece row, so counting would give the
 * right answer today and the wrong one the moment a one-piece SET existed as a
 * draft or a data error.
 *
 * All the selection arithmetic lives in `lib/size-selection.ts` (MOD-04). This
 * component owns the state and draws the controls; it decides nothing.
 *
 * STATE-01 rung 2: a half-made size choice is not shareable, not bookmarkable
 * and not back-button-relevant, so it stays local rather than going in the URL
 * the way filters do.
 */
export function ProductBuyBox({ product, availability, locale, messages }: ProductBuyBoxProps) {
  const [selection, setSelection] = useState(() => initialSelection(product));
  const t = messages.product;

  /*
   * A sold-out pair cannot be selected. When the overlay is unreadable every
   * status is `null`, which is NOT sold out — the page degrades to letting the
   * customer choose rather than refusing every size (§30.2).
   */
  const isSelectable = (pieceId: PieceId, sizeId: SizeId): boolean =>
    sizeStatus(availability, pieceId, sizeId) !== 'SOLD_OUT';

  // STATE-03: both derived during render rather than mirrored into state.
  const unifiedSize = unifiedSizeOf(product, selection);
  const isComplete = isSelectionComplete(product, selection, isSelectable);

  // DATA-13: the backend's verdict for the product, not a scan of the pieces.
  const isSoldOut = availability?.status === 'SOLD_OUT';

  const sizeableFirst = product.pieces.find((piece) => piece.sizes.length > 0);

  function handleUnified(sizeId: SizeId): void {
    setSelection((current) => applyUnifiedSize(product, current, sizeId, isSelectable));
  }

  function handlePiece(pieceId: PieceId, sizeId: SizeId): void {
    setSelection((current) => setPieceSize(current, pieceId, sizeId));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <bdi className="text-fg text-2xl font-semibold">
          {formatMoneyMinor(product.pricing.currentMinor, locale)}
        </bdi>
        {product.pricing.originalMinor === null ? null : (
          <bdi className="text-fg-muted text-base line-through">
            <span className="sr-only">{t.originalPriceLabel}: </span>
            {formatMoneyMinor(product.pricing.originalMinor, locale)}
          </bdi>
        )}
      </div>

      {product.type === 'SIMPLE' ? (
        /*
         * One selector and nothing else. The single piece is addressed directly
         * rather than through the unified helper, because "unified" across one
         * piece is just that piece.
         */
        sizeableFirst === undefined ? null : (
          <SizeSelector
            legend={t.selectSizeHeading}
            groupId={sizeableFirst.id}
            sizes={sizeableFirst.sizes}
            selected={selection[sizeableFirst.id] ?? null}
            onSelect={(sizeId) => {
              handlePiece(sizeableFirst.id, sizeId);
            }}
            statusOf={(sizeId) => sizeStatus(availability, sizeableFirst.id, sizeId)}
            messages={messages}
          />
        )
      ) : (
        <>
          {sizeableFirst === undefined ? null : (
            <SizeSelector
              legend={t.unifiedSizeHeading}
              groupId="unified"
              sizes={sizeableFirst.sizes}
              selected={unifiedSize}
              onSelect={handleUnified}
              statusOf={(sizeId) => sizeStatus(availability, sizeableFirst.id, sizeId)}
              messages={messages}
            />
          )}

          {/*
           * The per-piece override panel. It lists every piece, including
           * one-size ones — `SizeSelector` renders nothing for those, and the
           * piece still needs naming under "what is included".
           */}
          <div className="border-border flex flex-col gap-4 border-t pt-4">
            <h3 className="text-fg-muted text-sm font-medium">{t.perPieceHeading}</h3>

            {product.pieces.map((piece) => (
              <SizeSelector
                key={piece.id}
                legend={piece.name}
                groupId={piece.id}
                sizes={piece.sizes}
                selected={selection[piece.id] ?? null}
                onSelect={(sizeId) => {
                  handlePiece(piece.id, sizeId);
                }}
                statusOf={(sizeId) => sizeStatus(availability, piece.id, sizeId)}
                messages={messages}
              />
            ))}
          </div>
        </>
      )}

      {/*
       * MOD-01 — the bag's control, rendered as a slot rather than reached for.
       * The buy box owns the SELECTION; turning that selection into a
       * reservation is §16's job and lives in `features/bag`.
       *
       * `request` is null until every piece has a size, which is §16's first
       * invariant expressed as a type: there is no way to spell an add for a
       * half-sized set.
       */}
      <AddToBagButton
        request={
          isComplete
            ? {
                productId: product.id,
                selections: product.pieces.map((piece) => ({
                  pieceId: piece.id,
                  // `isComplete` guarantees this; the fallback keeps the type
                  // honest rather than asserting with `!` (TS-05).
                  sizeId: selection[piece.id] ?? piece.sizes[0]?.id ?? ('' as SizeId),
                })),
                quantity: 1,
              }
            : null
        }
        isSoldOut={isSoldOut}
        messages={messages}
        disabledHint={isSoldOut ? t.productSoldOut : isComplete ? '' : t.chooseSizeFirst}
      />
    </div>
  );
}
