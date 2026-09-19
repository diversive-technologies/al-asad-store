'use client';

import { useId, useRef } from 'react';

import { OnDemand } from '@/components/shared/OnDemand';
import { onDemandPart } from '@/hooks/use-on-demand';
import { useMessages } from '@/i18n/use-messages';

import { useBackInStock } from '../hooks/use-back-in-stock';
import type { BackInStockTarget, SoldOutSize } from '../types';
import { BackInStockSizes } from './BackInStockSizes';

/*
 * Deliberate code split (IMP-01a, PERF-06, PERF-10): the address form — its
 * resolver and its schema, and with them Zod — was first-load JavaScript on
 * every product page, and it is drawn only after a sold-out size is pressed. It
 * is fetched on that press, and takes focus when it lands, as it always did; a
 * download that fails says so in its place with Try again (`useOnDemand`).
 */
const emailForm = onDemandPart(() => import('./BackInStockEmailForm'));

export interface BackInStockOfferProps {
  /** The product, and the piece when the sizes above belong to one piece. */
  target: BackInStockTarget;
  /** The sizes in this group the live overlay REPORTED sold out (DATA-13). */
  sizes: readonly SoldOutSize[];
}

/**
 * §28.2's "Sold-out sizes with Notify Me", under one size selector.
 *
 * One chip per sold-out size, because the size is the whole question: a
 * signed-in customer presses it and is done, and anybody else is asked where to
 * write. The size radios above stay exactly as they were — a sold-out size still
 * cannot be CHOSEN to buy, so asking about one is its own control rather than a
 * change to what the selection means.
 *
 * Nothing is drawn when nothing in the group is sold out — including when the
 * overlay could not be read, since an unknown size is not a sold-out one
 * (§30.2). The exception is an answer still being told: `IN_STOCK` refreshes the
 * sizes, the chip it was about disappears, and the sentence explaining why has
 * to outlive it. So the notices are the last children, always in the same place,
 * and keep their elements whatever happens to the chips.
 *
 * The notices are live regions that exist before their words do: `status` for
 * the answers, `alert` only for a request that did not go through. Neither is
 * red (A11Y-06): the words carry the meaning.
 */
export function BackInStockOffer({ target, sizes }: BackInStockOfferProps) {
  const t = useMessages().backInStock;
  const chips = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const offer = useBackInStock(target, sizes, noticeRef);
  const leadId = useId();
  const { notice, asking } = offer;

  if (sizes.length === 0 && notice === null) return null;

  function cancel(): void {
    const opener = offer.asking;
    // Focus goes back to the chip that opened the form, before the form it is in goes.
    if (opener !== null) {
      chips.current?.querySelector<HTMLButtonElement>(`[data-size-id="${opener.id}"]`)?.focus();
    }
    offer.closeForm();
  }

  return (
    <div className="flex flex-col gap-3">
      {sizes.length === 0 ? null : (
        <div ref={chips} className="flex flex-col gap-2">
          <p id={leadId} className="text-fg-muted text-sm">
            {offer.asksForEmail ? t.lead : t.leadAccount}
          </p>
          <BackInStockSizes
            sizes={sizes}
            labelledBy={leadId}
            opensForm={offer.asksForEmail}
            expandedId={offer.asking?.id ?? null}
            pendingId={offer.pendingSizeId}
            onPress={(size) => {
              if (offer.asksForEmail) emailForm.warm();
              offer.press(size);
            }}
            words={t}
          />
        </div>
      )}

      {asking === null ? null : (
        <OnDemand part={emailForm}>
          {(form) => (
            <form.BackInStockEmailForm size={asking} onSend={offer.sendEmail} onCancel={cancel} />
          )}
        </OnDemand>
      )}

      <p ref={noticeRef} tabIndex={-1} role="status" className="text-fg text-sm empty:hidden">
        {notice?.role === 'status' ? notice.text : null}
      </p>
      <p role="alert" className="text-fg text-sm empty:hidden">
        {notice?.role === 'alert' ? notice.text : null}
      </p>
    </div>
  );
}
