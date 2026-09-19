'use client';

import { useCallback, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';

import { useQueryClient } from '@tanstack/react-query';

import type { Messages } from '@/i18n/messages/en';
import type { ProductId } from '@/lib/domain/ids';
import { formatTemplate } from '@/lib/utils/format';

import type { SavedItems } from '../schemas/saved-items.schema';
import { useSavedItemChange } from './use-saved-item-change';
import { useSavedItemsQuery } from './use-saved-items-query';

/** What the move needs of the product a card has just put in the bag. */
export interface MovedProduct {
  readonly id: ProductId;
  readonly name: string;
}

export interface MoveToBag {
  /** Takes a product the bag has just accepted off the saved list, and says so. */
  readonly moved: (product: MovedProduct) => void;
  /** What happened, for the page's polite live region; `null` before any move. */
  readonly status: string | null;
  /** Where focus lands once the card that was pressed has left the grid. */
  readonly focusRef: RefObject<HTMLAnchorElement | null>;
}

/**
 * §28.3 "move to bag" — on the saved-items page, adding a product to the bag
 * MOVES it: once the bag has taken it, it comes off the list, and the removal is
 * RECORDED (D6) through the same saved-items route the heart uses.
 *
 * Two writes, in order, and the order is the whole of the safety: the removal is
 * sent only after the add was ANSWERED `ADDED`, so the one state a failure can
 * leave is a garment in both places — never in neither. That failure is said in
 * words, and the list is put back (`useSavedItemChange`), because both halves of
 * "in your bag, and still saved" are then true. It shares the heart's mutation
 * scope, so a heart pressed during a move queues behind it rather than racing it.
 *
 * FOCUS. The card that was pressed leaves the grid, taking the focused size
 * button with it, so focus is moved in the handler — after `flushSync` has put
 * the "View bag" link in the document — onto that link, beside the words that say
 * what happened. The live region announces the move; the focused link says where
 * to go next.
 */
export function useMoveToBag(messages: Messages): MoveToBag {
  const t = messages.wishlist;
  const { key } = useSavedItemsQuery();
  const client = useQueryClient();
  const { mutate } = useSavedItemChange(key);
  const [status, setStatus] = useState<string | null>(null);
  const focusRef = useRef<HTMLAnchorElement | null>(null);

  const moved = useCallback(
    (product: MovedProduct) => {
      const was = client.getQueryData<SavedItems>(key)?.ids ?? [];
      // Optimistic, like the heart: the card leaves now and the server's answer replaces the guess.
      client.setQueryData<SavedItems>(key, { ids: was.filter((id) => id !== product.id) });

      flushSync(() => {
        setStatus(formatTemplate(t.movedToBag, { item: product.name }));
      });
      focusRef.current?.focus();

      mutate(
        { productId: product.id, saving: false, was },
        {
          onError: () => {
            setStatus(formatTemplate(t.movedToBagKept, { item: product.name }));
          },
        },
      );
    },
    [client, key, mutate, t],
  );

  return { moved, status, focusRef };
}
