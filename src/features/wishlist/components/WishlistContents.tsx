'use client';

import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { ProductGrid, type ProductCardPayload } from '@/features/catalogue/contract';
import { useSession } from '@/features/auth';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import { useSavedProducts } from '../hooks/use-saved-products';
import { useWishlist } from '../hooks/use-wishlist';
import { useCarriedFromThisBrowser } from './SavedItemsProvider';
import { WishlistNotes } from './WishlistNotes';
import { WishlistPrompt } from './WishlistPrompt';

export interface WishlistContentsProps {
  locale: Locale;
  messages: Messages;
  /** What a card's quick add hands over once the bag has taken the product. */
  onAddedToBag: (product: ProductCardPayload) => void;
}

/**
 * §28.3's saved items: the list in whichever state it is in.
 *
 * Offered only to a SIGNED-IN customer, because the heart is — a guest is asked
 * to sign in rather than shown a list they were never allowed to fill.
 *
 * `isReady` tells an unread list from an empty one, so the page does not flash
 * "nothing saved" on every load. Two reads can fail — the account's list, or the
 * products on it — and both are said as "we could not load", never as an empty
 * list, which would be false.
 *
 * The grid shows the products last read, LESS any the list no longer holds. The
 * products are read by the ids, so a heart or a move changes the key; the previous
 * answer is kept while the new one is asked for (`useSavedProducts`), and without
 * that filter the card that just left would stay until it landed.
 *
 * EMPTY is a fact about the list, not about what came back: ids whose products
 * were all withdrawn are still saved, and `/account` counts them. Said as
 * "nothing saved yet", the withdrawn note never appeared and the account page
 * disagreed with this one; the notes say what became of them instead.
 */
export function WishlistContents({ locale, messages, onAddedToBag }: WishlistContentsProps) {
  const t = messages.wishlist;
  const { isSignedIn } = useSession();
  const { ids, isReady, isUnreadable } = useWishlist();
  const carried = useCarriedFromThisBrowser();
  const saved = useSavedProducts(ids, locale, isReady && isSignedIn);

  if (!isSignedIn) {
    return (
      <WishlistPrompt heading={t.signedOutHeading} body={t.signedOutBody}>
        <ButtonLink href={ROUTES.signInFrom(ROUTES.wishlist)} variant="primary">
          {messages.auth.signInCta}
        </ButtonLink>
      </WishlistPrompt>
    );
  }

  if (!isReady || (ids.length > 0 && saved.isPending)) {
    return <p className="text-fg-muted py-16 text-sm">{messages.common.loading}</p>;
  }

  if (isUnreadable || saved.isError) {
    return <p className="text-fg-muted py-16 text-sm">{t.unreachable}</p>;
  }

  const entries = (saved.data ?? []).filter((entry) => ids.includes(entry.product.id));

  if (ids.length === 0) {
    return (
      <WishlistPrompt heading={t.emptyHeading} body={t.emptyBody}>
        <ButtonLink href={ROUTES.catalogue.list} variant="secondary">
          {messages.catalogue.browseAll}
        </ButtonLink>
      </WishlistPrompt>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* While the kept answer stands in, a product not yet read is not "withdrawn". */}
      <WishlistNotes
        shown={entries.length}
        saved={saved.isPlaceholderData ? entries.length : ids.length}
        carried={carried}
        locale={locale}
        messages={messages}
      />
      {/* The SAME grid and card as the catalogue (PD-01), with the quick add handing
          over to the move: an add here takes the product off this list. */}
      {entries.length === 0 ? null : (
        <ProductGrid
          entries={entries}
          locale={locale}
          messages={messages}
          onAddedToBag={onAddedToBag}
        />
      )}
    </div>
  );
}
