'use client';

import { useCallback, useState, type RefObject } from 'react';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { preloadBagPanel } from '@/features/bag/contract';
import type { Messages } from '@/i18n/messages/en';
import { queryKeys } from '@/lib/api/query-keys';
import type { SizeId } from '@/lib/domain/ids';
import { unwrap } from '@/lib/result';

import { fetchQuickAdd } from '../api/fetch-quick-add';
import type { ProductCard } from '../schemas/product-card.schema';
import type { QuickAddOfferPayload } from '../schemas/quick-add.schema';
import { useQuickAddMutation } from './use-quick-add-mutation';

export interface QuickAdd {
  readonly isTrayOpen: boolean;
  readonly toggleTray: () => void;
  readonly closeTray: () => void;
  readonly offer: QuickAddOfferPayload | undefined;
  readonly isOfferPending: boolean;
  readonly isOfferUnavailable: boolean;
  readonly isAdding: boolean;
  /** The size an add is in flight for, for its `aria-busy`; `null` otherwise. */
  readonly pendingSizeId: SizeId | null;
  /** Adds in the size chosen — or, for a product with no size to choose, `null`. */
  readonly add: (sizeId: SizeId | null) => void;
  /** Why the last add did not go in, in words; `null` when there is nothing to say. */
  readonly notice: string | null;
}

/**
 * MOD-05 layer 2 — a card's quick add: the tray, the offer it asks for when it
 * opens, and the add (`useQuickAddMutation`).
 *
 * The size tray asks the backend for its sizes at the moment it opens
 * (`/api/quick-add`). Carrying live per-size stock on 24 cards would put stock
 * back into the cached projection §8.2 deliberately keeps it out of; asking on
 * intent costs one request and is the freshest answer anyone on the page has.
 *
 * Once the bag has taken the product, the bag panel opens on it — the store's
 * usual confirmation. A page that passes `onAdded` confirms the add itself
 * instead: the saved-items page, where an add MOVES the product off the list the
 * customer is looking at, and says so on that page rather than covering it with a
 * modal whose inert background would swallow the announcement.
 *
 * `toggleRef` is the card's tray toggle, which the add hands focus to. The card
 * owns it and hands it in, so nothing drawn from this hook's answer reads a ref
 * during render (`react-hooks/refs`).
 */
export function useQuickAdd(
  product: ProductCard,
  messages: Messages,
  toggleRef: RefObject<HTMLButtonElement | null>,
  onAdded?: (product: ProductCard) => void,
): QuickAdd {
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const offer = useQuickAddOffer(product.slug, isTrayOpen);

  // Stable, because the tray's document listeners are keyed on it.
  const closeTray = useCallback(() => {
    setIsTrayOpen(false);
  }, []);

  const adding = useQuickAddMutation(product, messages, {
    offer: offer.data,
    toggleRef,
    closeTray,
    onAdded,
  });

  return {
    isTrayOpen,
    toggleTray: () => {
      // An add from the tray opens the bag panel; its contents download meanwhile.
      if (!isTrayOpen) preloadBagPanel();
      setIsTrayOpen((current) => !current);
      adding.reset();
    },
    closeTray,
    offer: offer.data,
    isOfferPending: offer.isPending,
    isOfferUnavailable: offer.isError,
    isAdding: adding.isAdding,
    pendingSizeId: adding.pendingSizeId,
    add: adding.add,
    notice: adding.notice,
  };
}

/** The offer, asked for only once the customer opens the tray. */
function useQuickAddOffer(slug: string, isTrayOpen: boolean): UseQueryResult<QuickAddOfferPayload> {
  return useQuery({
    queryKey: queryKeys.catalogue.quickAdd(slug),
    queryFn: ({ signal }) => unwrap(fetchQuickAdd(slug, signal)),
    enabled: isTrayOpen,
    // DATA-09: stock, so no interval over which a cached copy is safe to show.
    staleTime: 0,
    retry: false,
  });
}
