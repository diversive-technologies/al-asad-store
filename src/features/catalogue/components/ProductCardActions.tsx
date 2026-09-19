'use client';

import { useRef } from 'react';

import { useSession } from '@/features/auth';
import { useWishlist } from '@/features/wishlist/contract';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { ShoppingBag, X } from '@/lib/vendor/icons';

import { useQuickAdd } from '../hooks/use-quick-add';
import { useTrayDismissal } from '../hooks/use-tray-dismissal';
import type { ProductCard } from '../schemas/product-card.schema';
import { QuickAddTray } from './QuickAddTray';
import { WishlistHeart } from './WishlistHeart';

export interface ProductCardActionsProps {
  product: ProductCard;
  isSoldOut: boolean;
  /** The size tray reads the customer's saved sizes in this language (§28.3). */
  locale: Locale;
  messages: Messages;
  /** What the page does once the bag has taken the product; the bag panel opens when absent. */
  onAddedToBag?: ((product: ProductCard) => void) | undefined;
}

/**
 * §28.1's card actions: save it, or buy it without leaving the grid.
 *
 * §28.3 makes the wishlist an ACCOUNT feature, so a guest has nowhere to see one
 * — offering the heart anyway let them save into a list they could never open.
 * It is hidden until there is a session. The quick add stays, because guest
 * checkout is Release 1 scope (§28.2) and a guest really can buy.
 *
 * The column sits ABOVE the size tray (`z-20`), which is `z-10` and later in the
 * tree: the toggle that closes the tray is in this column, and at three columns
 * on a phone the tray is 124px over a 130px photograph, so at equal z-index every
 * tap on the X landed on the tray instead. The whole action area — column and
 * tray — is one `contents` wrapper, so a press outside it, or Escape, closes the
 * tray as well (`useTrayDismissal`).
 *
 * A11Y-05 / ERR-04: a refused save is ANNOUNCED, not only undone. The heart has
 * already gone back to what the server holds, and without a word the customer
 * would have watched it fill and empty for no stated reason. The line reads
 * `text-surface` on a plate of `fg`, which invert together in the two themes —
 * it used to name a `text-bg` token that does not exist, and so read as `fg` on
 * `fg`: unreadable in both.
 */
export function ProductCardActions({
  product,
  isSoldOut,
  locale,
  messages,
  onAddedToBag,
}: ProductCardActionsProps) {
  const t = messages.catalogue;
  const wishlist = useWishlist();
  const { isSignedIn } = useSession();
  const actionsRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const quickAdd = useQuickAdd(product, messages, toggleRef, onAddedToBag);
  useTrayDismissal(quickAdd.isTrayOpen, quickAdd.closeTray, {
    actions: actionsRef,
    toggle: toggleRef,
  });

  return (
    <div ref={actionsRef} className="contents">
      <div className="absolute end-2 top-2 z-20 flex flex-col gap-2">
        {!isSignedIn ? null : (
          <WishlistHeart productId={product.id} wishlist={wishlist} messages={messages} />
        )}

        {isSoldOut ? null : (
          <button
            ref={toggleRef}
            type="button"
            onClick={quickAdd.toggleTray}
            aria-label={quickAdd.isTrayOpen ? t.quickAddClose : t.quickAddOpen}
            aria-expanded={quickAdd.isTrayOpen}
            className="card-action"
          >
            {quickAdd.isTrayOpen ? (
              <X className="h-4 w-4" aria-hidden />
            ) : (
              <ShoppingBag className="h-4 w-4" aria-hidden />
            )}
          </button>
        )}
      </div>

      <p
        role="alert"
        className="bg-fg/85 text-surface rounded-card absolute inset-x-2 bottom-2 z-30 px-2 py-1 text-center text-xs empty:hidden"
      >
        {wishlist.changeFailed ? t.wishlistChangeFailed : null}
      </p>

      {!quickAdd.isTrayOpen ? null : (
        <QuickAddTray quickAdd={quickAdd} locale={locale} messages={messages} />
      )}
    </div>
  );
}
