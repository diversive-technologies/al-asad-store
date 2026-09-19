'use client';

import { Button } from '@/components/ui/button';
import type { Messages } from '@/i18n/messages/en';

import { useAddToBag } from '../hooks/use-add-to-bag';
import type { AddToBagRequest } from '../schemas/bag-write.schema';

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
  const { add, isPending, notice } = useAddToBag(messages);

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="lg"
        disabled={isSoldOut || request === null}
        /* Busy but ENABLED: disabling it dropped the focus it held, so the bag
           panel opened with nothing to hand focus back to on closing. The latch
           in `useAddToBag` refuses a second press instead. */
        isBusy={isPending}
        onClick={() => {
          if (request !== null) add(request);
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
