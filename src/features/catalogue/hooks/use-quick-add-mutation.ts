'use client';

import { useRef, type RefObject } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { addNoticeFor, addToBag, useBag, type AddRefusalWords } from '@/features/bag/contract';
import type { Messages } from '@/i18n/messages/en';
import { queryKeys } from '@/lib/api/query-keys';
import type { SizeId } from '@/lib/domain/ids';
import { unwrap } from '@/lib/result';

import { quickAddSelections } from '../lib/quick-add';
import type { ProductCard } from '../schemas/product-card.schema';
import type { QuickAddOfferPayload } from '../schemas/quick-add.schema';

/** What the add needs from the card around it. */
export interface QuickAddContext {
  /** The offer the tray was drawn from — the sizes a press can name. */
  readonly offer: QuickAddOfferPayload | undefined;
  /** The tray's toggle: the control focus waits on whenever the one pressed goes. */
  readonly toggleRef: RefObject<HTMLButtonElement | null>;
  readonly closeTray: () => void;
  /** What the page does once the bag has taken the product; the bag panel opens when absent. */
  readonly onAdded: ((product: ProductCard) => void) | undefined;
}

export interface QuickAddMutation {
  readonly add: (sizeId: SizeId | null) => void;
  /** The size an add is in flight for; `null` also for the one-size add, and when idle. */
  readonly pendingSizeId: SizeId | null;
  readonly isAdding: boolean;
  /** Why the last add did not go in, in words; `null` when there is nothing to say. */
  readonly notice: string | null;
  /** Forgets the last answer, so a tray opened again starts without it. */
  readonly reset: () => void;
}

/**
 * The quick add's one write — split out of `useQuickAdd` (MOD-03).
 *
 * FORM-06 — a synchronous latch, because `isPending` reaches React only after a
 * re-render: two taps queued before it made two §7.1 adds and a bag holding two.
 * The size buttons stay ENABLED while it is in flight (`aria-busy` says so):
 * a disabled button drops the keyboard focus it holds, and every size used to be
 * drawn struck through, the sold-out look, for the length of the add.
 *
 * A11Y-08 — focus never falls to the page:
 * - ADDED: the toggle takes focus BEFORE the tray closes and the bag opens, so the
 *   bag's dialog records it and hands focus back to it on closing. The size that
 *   was pressed goes with the tray; the bag used to hand focus back to `<body>`.
 * - refused: the offer is read again (DATA-06), since it showed as buyable a
 *   size the add was just refused, and the redrawn size may be disabled — so the
 *   toggle takes focus rather than going down with it.
 * - a failed request keeps focus where it was: nothing is redrawn.
 *
 * STATE-02 — the notice is DERIVED from the mutation's own answer rather than
 * copied into state.
 */
export function useQuickAddMutation(
  product: ProductCard,
  messages: Messages,
  context: QuickAddContext,
): QuickAddMutation {
  const t = messages.catalogue;
  const { onSummary, open } = useBag();
  const queryClient = useQueryClient();
  const inFlight = useRef(false);

  const mutation = useMutation({
    mutationFn: (sizeId: SizeId | null) =>
      unwrap(
        addToBag({
          productId: product.id,
          selections: context.offer === undefined ? [] : quickAddSelections(context.offer, sizeId),
          quantity: 1,
        }),
      ),
    onSuccess: (result) => {
      context.toggleRef.current?.focus();

      if (result.kind !== 'ADDED') {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.catalogue.quickAdd(product.slug),
        });
        return;
      }

      context.closeTray();
      onSummary(result.summary);
      if (context.onAdded === undefined) open();
      else context.onAdded(product);
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });

  return {
    add: (sizeId) => {
      if (inFlight.current) return;
      inFlight.current = true;
      mutation.mutate(sizeId);
    },
    pendingSizeId: mutation.isPending ? (mutation.variables ?? null) : null,
    isAdding: mutation.isPending,
    // ERR-11: our copy, never the upstream text.
    notice: mutation.isError
      ? t.quickAddFailed
      : mutation.data === undefined
        ? null
        : addNoticeFor(mutation.data, quickAddWords(t)),
    reset: mutation.reset,
  };
}

/** The card's own short refusals — a tile has no room for the bag's sentences. */
function quickAddWords(t: Messages['catalogue']): AddRefusalWords {
  return {
    unavailable: t.quickAddUnavailable,
    measurementsRefused: t.quickAddFailed,
    selectionRefused: t.quickAddRefused,
  };
}
