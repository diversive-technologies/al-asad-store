'use client';

import type { Wishlist } from '@/features/wishlist/contract';
import type { Messages } from '@/i18n/messages/en';
import type { ProductId } from '@/lib/domain/ids';
import { cn } from '@/lib/utils/cn';
import { Heart } from '@/lib/vendor/icons';

export interface WishlistHeartProps {
  productId: ProductId;
  /**
   * The card's own wishlist handle, passed in rather than read here: a refused
   * change is reported per hook instance, and the card's announcement has to
   * hear about the press this heart made.
   */
  wishlist: Wishlist;
  messages: Messages;
}

/**
 * §28.1's save control on a card: a TOGGLE, so one constant name and
 * `aria-pressed` for the state (A11Y-04). A name that flipped with the state,
 * beside `aria-pressed`, was announced as "Remove from wishlist, pressed", which
 * leaves the listener to work out which of the two it means.
 */
export function WishlistHeart({ productId, wishlist, messages }: WishlistHeartProps) {
  const t = messages.catalogue;
  const saved = wishlist.isSaved(productId);

  return (
    <button
      type="button"
      onClick={() => {
        wishlist.toggle(productId);
      }}
      aria-label={t.wishlistAdd}
      aria-pressed={saved}
      className="card-action"
    >
      <Heart className={cn('h-4 w-4', saved ? 'text-danger-500 fill-current' : null)} aria-hidden />
    </button>
  );
}
