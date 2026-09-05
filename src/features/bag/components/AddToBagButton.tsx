'use client';

import { useState } from 'react';

import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import type { Messages } from '@/i18n/messages/en';
import { unwrap } from '@/lib/result';
import { formatTemplate } from '@/lib/utils/format';

import { addToBag } from '../api/bag-browser';
import type { AddToBagRequest, AddToBagResult } from '../schemas/bag.schema';
import { useBag } from './BagProvider';

export interface AddToBagButtonProps {
  /** `null` until every piece has a size — §16's first invariant, upstream. */
  request: AddToBagRequest | null;
  isSoldOut: boolean;
  messages: Messages;
  /** Copy for the disabled states, which the buy box owns. */
  disabledHint: string;
}

/**
 * §28.2's Add to bag, and the point at which browsing becomes a reservation.
 *
 * It is deliberately NOT the buy box's own button. The buy box is the catalogue
 * feature's, and MOD-01 forbids one feature reaching into another's internals —
 * so the bag exports this and the buy box renders it as a slot, exactly as the
 * header does with the catalogue's search field.
 */
export function AddToBagButton({
  request,
  isSoldOut,
  messages,
  disabledHint,
}: AddToBagButtonProps) {
  const t = messages.bag;
  const { open, onSummary } = useBag();
  const [notice, setNotice] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: (body: AddToBagRequest) => unwrap(addToBag(body)),
    onSuccess: (result: AddToBagResult) => {
      /*
       * §7.1 — the refusal names the piece, so the customer is told "Shalwar in
       * size L is no longer available" rather than that the set is unavailable
       * and left to work out which part.
       */
      if (result.kind === 'UNAVAILABLE') {
        setNotice(
          formatTemplate(t.unavailable, { piece: result.pieceName, size: result.sizeLabel }),
        );
        return;
      }

      setNotice(null);
      /*
       * DATA-06 — the response IS the refreshed bag, so the cache is set from
       * it rather than invalidated; no second round trip, and no window where
       * the panel slides open showing the pre-add contents.
       */
      onSummary(result.summary);
      open();
    },
    onError: () => {
      // ERR-11 / SEC-07: our copy, never the upstream error text.
      setNotice(t.addFailed);
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="lg"
        disabled={isSoldOut || request === null}
        isLoading={add.isPending}
        onClick={() => {
          if (request !== null) add.mutate(request);
        }}
      >
        {isSoldOut ? messages.product.productSoldOut : messages.product.addToBag}
      </Button>

      {/* A11Y-05 / ERR-04: announced, because a sighted user sees it appear and
          a screen-reader user otherwise would not know it arrived. */}
      <p
        aria-live="polite"
        role={notice === null ? undefined : 'alert'}
        className="text-danger-500 text-xs empty:hidden"
      >
        {notice}
      </p>

      {notice === null ? <p className="text-fg-muted text-xs">{disabledHint}</p> : null}
    </div>
  );
}
