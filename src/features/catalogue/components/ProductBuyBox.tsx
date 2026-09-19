'use client';

import type { ReactNode } from 'react';

import { AddToBagButton } from '@/features/bag/contract';
import { RememberSizeOffer, useSavedSizes } from '@/features/saved-sizes/contract';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatMoneyMinor } from '@/lib/utils/format';

import { useBuySelection } from '../hooks/use-buy-selection';
import { chosenSizeOf } from '../lib/saved-size-prefill';
import { bagSelectionsOf } from '../lib/size-selection';
import type { ProductDetailAvailability } from '../schemas/piece-availability.schema';
import type { ProductDetail } from '../schemas/product-detail.schema';
import { ProductSizing } from './ProductSizing';

export interface ProductBuyBoxProps {
  product: ProductDetail;
  /** `null` when the live overlay could not be read (§30.2). */
  availability: ProductDetailAvailability | null;
  locale: Locale;
  messages: Messages;
  /** §28.2's size guide, drawn beside the size selectors — see `ProductSizing`. */
  sizeGuide: ReactNode;
}

/**
 * §28.2's buy box, and the one place the SIMPLE/SET distinction is visible.
 *
 * "A SIMPLE product shows one size selector and nothing else; a SET shows the
 * unified selector plus the per-piece override panel." That branch reads the
 * DECLARED `product.type` (DATA-13a) — never `pieces.length` (`ProductSizing`).
 *
 * All the selection arithmetic lives in `lib/` (MOD-04) and the choice itself in
 * `useBuySelection`, which is also where §28.3's saved sizes pre-fill it. This
 * component draws the controls; it decides nothing.
 *
 * MOD-01 — Add to bag is the bag's control, and "Remember this size" the saved
 * sizes', each reached through its feature's client-safe barrel. The buy box owns
 * the SELECTION; turning it into a reservation is §16's job and lives in
 * `features/bag`. Its `request` is null until every piece that has sizes has one,
 * which is §16's first invariant expressed as a type: there is no way to spell an
 * add for a half-sized set. A piece with no size set is not named in it — the
 * backend resolves its key (§7.1 step 1). A pre-filled size is a choice like any
 * other: it adds nothing until the customer presses Add to bag.
 */
export function ProductBuyBox({
  product,
  availability,
  locale,
  messages,
  sizeGuide,
}: ProductBuyBoxProps) {
  const t = messages.product;
  const saved = useSavedSizes({ locale });
  const buy = useBuySelection(product, availability, saved.sizeIds);

  // DATA-13: the backend's verdict for the product, not a scan of the pieces.
  const isSoldOut = availability?.status === 'SOLD_OUT';

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

      <ProductSizing
        product={product}
        availability={availability}
        selection={buy.selection}
        savedSizeIds={saved.sizeIds}
        onUnified={buy.chooseUnified}
        onPiece={buy.choosePiece}
        sizeGuide={sizeGuide}
      />

      <RememberSizeOffer
        size={chosenSizeOf(product, buy.selection)}
        isPrefilled={buy.isPrefilled}
        locale={locale}
      />

      <AddToBagButton
        request={
          buy.isComplete
            ? {
                productId: product.id,
                selections: bagSelectionsOf(product, buy.selection),
                quantity: 1,
              }
            : null
        }
        isSoldOut={isSoldOut}
        messages={messages}
        disabledHint={isSoldOut ? t.productSoldOut : buy.isComplete ? '' : t.chooseSizeFirst}
      />
    </div>
  );
}
