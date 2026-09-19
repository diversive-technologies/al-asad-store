'use client';

import { useRef, useState } from 'react';

import { useMutation } from '@tanstack/react-query';

import type { Messages } from '@/i18n/messages/en';
import { unwrap } from '@/lib/result';

import { addToBag } from '../api/bag-browser';
import { preloadBagPanel } from '../components/BagPanel';
import { useBag } from '../components/BagProvider';
import { addNoticeFor } from '../lib/add-notice';
import type { AddToBagRequest, AddToBagResult } from '../schemas/bag-write.schema';

export interface AddToBag {
  /** Sends the add. A press while one is already in flight is ignored. */
  add: (request: AddToBagRequest) => void;
  isPending: boolean;
  /** A refusal or a failure, in our words; `null` after an add that went in. */
  notice: string | null;
}

/**
 * MOD-05 — §16 `addItem` from a button: the request, what it answered, and the
 * panel opening on the refreshed bag.
 *
 * A synchronous latch against double submission (FORM-06). `disabled={isPending}`
 * is NOT enough on its own, and the gap is easy to miss: `isPending` only becomes
 * true after React re-renders, so two clicks landing in the same tick — a
 * double-click, an impatient tap, a trackpad that bounces — both pass the check
 * and both fire. Measured on the product page: one press produced two identical
 * POSTs and a quantity of 2. A ref flips synchronously, inside the handler,
 * before either can proceed.
 */
export function useAddToBag(messages: Messages): AddToBag {
  const t = messages.bag;
  const { open, onSummary } = useBag();
  const [notice, setNotice] = useState<string | null>(null);
  const inFlight = useRef(false);

  const mutation = useMutation({
    mutationFn: (body: AddToBagRequest) => unwrap(addToBag(body)),
    onSuccess: (result: AddToBagResult) => {
      /* Every refusal has its own words (`addNoticeFor`, exhaustive): §7.1 names
         the piece that ran out, and a refused profile or selection says what to
         DO, since no reason is sent. */
      setNotice(addNoticeFor(result, t));
      if (result.kind !== 'ADDED') return;

      /* DATA-06 — the response IS the refreshed bag, so the cache is set from it
         rather than invalidated; no second round trip, and no window where the
         panel slides open showing the pre-add contents. */
      onSummary(result.summary);
      open();
    },
    // ERR-11 / SEC-07: our copy, never the upstream error text.
    onError: () => {
      setNotice(t.addFailed);
    },
  });

  return {
    add: (request) => {
      if (inFlight.current) return;
      inFlight.current = true;
      // The panel opens on success; its contents download while the add is sent.
      preloadBagPanel();
      mutation.mutate(request, {
        onSettled: () => {
          inFlight.current = false;
        },
      });
    },
    isPending: mutation.isPending,
    notice,
  };
}
