'use client';

import { useState } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth';
import { addToBag, useBag } from '@/features/bag/contract';
import { useWishlist } from '@/hooks/use-wishlist';
import type { Messages } from '@/i18n/messages/en';
import { queryKeys } from '@/lib/api/query-keys';
import type { ProductId, SizeId } from '@/lib/domain/ids';
import { unwrap } from '@/lib/result';
import { cn } from '@/lib/utils/cn';
import { Heart, ShoppingBag, X } from '@/lib/vendor/icons';

import { fetchQuickAdd } from '../api/fetch-quick-add';
import type { ProductCard } from '../schemas/product-card.schema';

export interface ProductCardActionsProps {
  product: ProductCard;
  isSoldOut: boolean;
  messages: Messages;
}

/**
 * §28.1's card actions: save it, or buy it without leaving the grid.
 *
 * The size tray is opened by the bag button and asks the backend for its sizes
 * at that moment (`/api/quick-add`). Carrying live per-size stock on 24 cards
 * would put stock back into the cached projection §8.2 deliberately keeps it
 * out of; asking on intent costs one request and is the freshest answer anyone
 * on the page has.
 */
export function ProductCardActions({ product, isSoldOut, messages }: ProductCardActionsProps) {
  const t = messages.catalogue;
  const { onSummary, open } = useBag();
  const { isSaved, toggle } = useWishlist();
  /*
   * §28.3 makes the wishlist an ACCOUNT feature, so a guest has nowhere to see
   * one — offering the heart anyway let them save into a list they could never
   * open. It is hidden until there is a session. The quick add stays, because
   * guest checkout is Release 1 scope (§28.2) and a guest really can buy.
   */
  const { isSignedIn } = useSession();
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const saved = isSaved(product.id);

  const offer = useQuery({
    queryKey: queryKeys.catalogue.quickAdd(product.slug),
    queryFn: ({ signal }) => unwrap(fetchQuickAdd(product.slug, signal)),
    // Only asked once the customer opens the tray.
    enabled: isTrayOpen,
    // DATA-09: stock, so no interval over which a cached copy is safe to show.
    staleTime: 0,
    retry: false,
  });

  const add = useMutation({
    mutationFn: (sizeId: SizeId) =>
      unwrap(
        addToBag({
          productId: product.id as ProductId,
          /*
           * The operator's rule, made concrete: a card sells the product as ONE
           * entity, so the chosen size is applied to every piece. A three-piece
           * suit still reserves three rows (§7.1) — the customer just does not
           * size them apart from a grid tile.
           */
          selections: (offer.data?.pieceIds ?? []).map((pieceId) => ({ pieceId, sizeId })),
          quantity: 1,
        }),
      ),
    onSuccess: (result) => {
      if (result.kind === 'UNAVAILABLE') {
        // §7.1 names the piece that failed rather than refusing generically.
        setNotice(`${result.pieceName} · ${result.sizeLabel}`);
        return;
      }

      setNotice(null);
      setIsTrayOpen(false);
      onSummary(result.summary);
      open();
    },
    onError: () => {
      setNotice(t.quickAddFailed); // ERR-11: our copy, not the upstream text.
    },
  });

  return (
    <>
      <div className="absolute end-2 top-2 z-10 flex flex-col gap-2">
        {!isSignedIn ? null : (
          <button
            type="button"
            onClick={() => {
              toggle(product.id);
            }}
            // A11Y-04: the label says which state pressing it will produce.
            aria-label={saved ? t.wishlistRemove : t.wishlistAdd}
            aria-pressed={saved}
            className="card-action"
          >
            <Heart
              className={cn('h-4 w-4', saved ? 'text-danger-500 fill-current' : null)}
              aria-hidden
            />
          </button>
        )}

        {isSoldOut ? null : (
          <button
            type="button"
            onClick={() => {
              setIsTrayOpen((current) => !current);
              setNotice(null);
            }}
            aria-label={isTrayOpen ? t.quickAddClose : t.quickAddOpen}
            aria-expanded={isTrayOpen}
            className="card-action"
          >
            {isTrayOpen ? (
              <X className="h-4 w-4" aria-hidden />
            ) : (
              <ShoppingBag className="h-4 w-4" aria-hidden />
            )}
          </button>
        )}
      </div>

      {!isTrayOpen ? null : (
        <div className="card-size-tray">
          {offer.isPending ? (
            <p className="text-xs text-white/80">{messages.common.loading}</p>
          ) : null}

          {offer.isError ? <p className="text-xs text-white/80">{t.quickAddFailed}</p> : null}

          {offer.data === undefined ? null : (
            <div className="flex flex-wrap justify-center gap-1.5">
              {offer.data.sizes.map((size) => (
                <button
                  key={size.id}
                  type="button"
                  disabled={!size.isAvailable || add.isPending}
                  onClick={() => {
                    add.mutate(size.id);
                  }}
                  className="card-size"
                >
                  {size.label}
                </button>
              ))}
            </div>
          )}

          {/* A11Y-05 / ERR-04: a refusal is announced, not only shown. */}
          <p role="alert" className="text-danger-500 mt-1 text-[0.625rem] empty:hidden">
            {notice}
          </p>
        </div>
      )}
    </>
  );
}
