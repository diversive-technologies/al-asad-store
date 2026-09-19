'use client';

import { useRef, useState, type RefObject } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { queryKeys } from '@/lib/api/query-keys';
import type { CartLineId } from '@/lib/domain/ids';
import { assertNever, unwrap } from '@/lib/result';

import {
  moveBagLineToWishlist,
  removeBagLine,
  updateLineQuantity,
  type BagError,
} from '../api/bag-browser';
import { useBag } from '../components/BagProvider';
import {
  lineChangeFailure,
  lineChangeOutcome,
  type LineChangeAnswer,
  type LineChangeRequest,
} from '../lib/line-change-outcome';
import type { BagLine } from '../schemas/bag.schema';
import { useRemovalFocus } from './use-removal-focus';

/** What a bag line may ask for. Grouped, so a row takes one prop for all of them (CMP-06). */
export interface BagLineActions {
  /** Sends a new quantity. `false` when another change is still in flight. */
  changeQuantity: (line: BagLine, quantity: number) => boolean;
  /** Removes the line. `false` when another change is still in flight. */
  remove: (line: BagLine) => boolean;
  /** §16 `moveToWishlist`. `false` when another change is still in flight. */
  moveToWishlist: (line: BagLine) => boolean;
  registerRemoveControl: (lineId: CartLineId, control: HTMLButtonElement | null) => void;
}

export interface BagLineChanges {
  actions: BagLineActions;
  /** A change is in flight. Carried as `aria-busy`, never as `disabled` (§30.3). */
  isBusy: boolean;
  /** A refusal or a failure, in our words. */
  notice: string | null;
  /** What just happened, for a polite live region. */
  status: string | null;
  emptyStateRef: RefObject<HTMLParagraphElement | null>;
}

interface LineChange {
  line: BagLine;
  request: LineChangeRequest;
  /** The bag's lines when the change was asked for, for where focus goes after. */
  before: readonly CartLineId[];
}

/**
 * The mutationFn, and nothing else calls it. DATA-03a: `unwrap` is the only
 * Result→throw adapter, used at this TanStack boundary; each answer is paired with
 * the kind of request it answers, because the three reach different unions.
 */
function sendLineChange({ line, request }: LineChange): Promise<LineChangeAnswer> {
  switch (request.kind) {
    case 'QUANTITY':
      return unwrap(updateLineQuantity(line.id, request.quantity)).then(
        (result): LineChangeAnswer => ({ request: 'QUANTITY', result }),
      );
    case 'REMOVE':
      return unwrap(removeBagLine(line.id)).then((result): LineChangeAnswer => ({
        request: 'REMOVE',
        result,
      }));
    case 'MOVE_TO_WISHLIST':
      return unwrap(moveBagLineToWishlist(line.id)).then((result): LineChangeAnswer => ({
        request: 'MOVE_TO_WISHLIST',
        result,
      }));
    default:
      return assertNever(request);
  }
}

/**
 * MOD-05 — every edit a bag line can make: quantity, removal and the move into
 * saved items, and what the page says and focuses afterwards.
 *
 * The latch is synchronous (FORM-06): `isPending` only turns true after a render,
 * so two presses in one tick would both send. It is what lets the buttons stay
 * ENABLED while a change is in flight — a disabled button cannot hold focus, and
 * pressing + used to throw a keyboard user back to the top of the page. It is ONE
 * latch for all three, so a move cannot race a quantity change on the same line.
 */
export function useBagLineChanges(messages: Messages, locale: Locale): BagLineChanges {
  const t = messages.bag;
  const { bag, onSummary } = useBag();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const inFlight = useRef(false);
  const focus = useRemovalFocus(bag.data?.lines);

  const change = useMutation<LineChangeAnswer, BagError, LineChange>({
    mutationFn: sendLineChange,
    onSuccess: (answer, { line, before }) => {
      const outcome = lineChangeOutcome(answer, line, t, locale);
      setNotice(outcome.notice);
      if (outcome.status !== null) setStatus(outcome.status);
      if (outcome.lineLeft) focus.expect(before, line.id);
      // DATA-06 — the answer IS the refreshed bag, so the cache is set from it.
      if (outcome.summary !== null) onSummary(outcome.summary);
      // DATA-06 — the move changed the saved items too; every heart reading them is stale.
      if (outcome.savedItemsChanged) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.all });
      }
    },
    // ERR-11: our copy, never the upstream error text (SEC-07).
    onError: (error, { request }) => {
      setNotice(lineChangeFailure(request.kind, error, t));
      // DATA-06 — re-read, or a line whose hold lapsed stays, failing every press.
      void queryClient.invalidateQueries({ queryKey: queryKeys.bag.summary() });
    },
  });

  function send(line: BagLine, request: LineChangeRequest): boolean {
    if (inFlight.current) return false;
    inFlight.current = true;
    setStatus(null);
    const release = (): void => {
      inFlight.current = false;
    };
    const before = (bag.data?.lines ?? []).map((entry) => entry.id);
    change.mutate({ line, request, before }, { onSettled: release });
    return true;
  }

  return {
    actions: {
      changeQuantity: (line, quantity) => send(line, { kind: 'QUANTITY', quantity }),
      remove: (line) => send(line, { kind: 'REMOVE' }),
      moveToWishlist: (line) => send(line, { kind: 'MOVE_TO_WISHLIST' }),
      registerRemoveControl: focus.registerRemoveControl,
    },
    isBusy: change.isPending,
    notice,
    status,
    emptyStateRef: focus.emptyStateRef,
  };
}
