'use client';

import { useState } from 'react';

import { useMutation } from '@tanstack/react-query';

import { ButtonLink } from '@/components/ui/button';
import { InfoPopover } from '@/components/ui/popover';
import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import type { CartLineId } from '@/lib/domain/ids';
import { unwrap } from '@/lib/result';
import { formatTemplate } from '@/lib/utils/format';

import { removeBagLine, updateLineQuantity } from '../api/bag-browser';
import type { AddToBagResult, BagLine } from '../schemas/bag.schema';
import { BagLineRow } from './BagLineRow';
import { useBag } from './BagProvider';

export interface BagContentsProps {
  locale: Locale;
  messages: Messages;
}

interface LineChange {
  lineId: CartLineId;
  quantity: number | null;
}

/**
 * The bag's contents, and the editing that goes with them.
 *
 * Extracted because there are TWO surfaces showing the same bag — the slide-in
 * panel and the `/bag` page — and a second copy of the lines, the quantity
 * control and the hold explanation would be a second thing to keep correct
 * (PD-01). The panel adds a dialog around this; the page adds a heading.
 */
export function BagContents({ locale, messages }: BagContentsProps) {
  const t = messages.bag;
  const { bag, onSummary } = useBag();
  const [notice, setNotice] = useState<string | null>(null);

  const change = useMutation({
    mutationFn: ({ lineId, quantity }: LineChange) =>
      // DATA-03a: `unwrap` is the only Result→throw adapter used at a call site.
      unwrap(quantity === null ? removeBagLine(lineId) : updateLineQuantity(lineId, quantity)),
    onSuccess: (result: AddToBagResult) => {
      /*
       * §7.1 — raising a quantity runs the same reservation transaction as
       * adding, so it can come back `UNAVAILABLE`. The bag is left exactly as
       * it was and the customer is told WHICH piece ran out, rather than the
       * number silently snapping back.
       */
      if (result.kind === 'UNAVAILABLE') {
        setNotice(
          formatTemplate(t.unavailable, { piece: result.pieceName, size: result.sizeLabel }),
        );
        return;
      }

      setNotice(null);
      onSummary(result.summary);
    },
    onError: () => {
      // ERR-11: our copy, never the upstream error text (SEC-07).
      setNotice(t.updateFailed);
    },
  });

  const summary = bag.data;
  const isBusy = change.isPending;

  function onQuantityChange(line: BagLine, quantity: number): void {
    change.mutate({ lineId: line.id, quantity });
  }

  function onRemove(line: BagLine): void {
    change.mutate({ lineId: line.id, quantity: null });
  }

  return (
    <>
      {/* A11Y-05 / ERR-04: refusals are announced, not only shown. */}
      <p
        aria-live="polite"
        role={notice === null ? undefined : 'alert'}
        className="text-danger-500 text-sm empty:hidden"
      >
        {notice}
      </p>

      {bag.isPending ? <p className="text-fg-muted text-sm">{messages.common.loading}</p> : null}

      {bag.isError ? <p className="text-fg-muted text-sm">{t.unreachable}</p> : null}

      {summary !== undefined && summary.lines.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-fg-muted text-sm">{t.emptyBody}</p>
          <div className="mt-4">
            <ButtonLink href={ROUTES.catalogue.list} variant="secondary">
              {t.startShopping}
            </ButtonLink>
          </div>
        </div>
      ) : null}

      {summary === undefined || summary.lines.length === 0 ? null : (
        <>
          <ul aria-busy={isBusy}>
            {summary.lines.map((line) => (
              <BagLineRow
                key={line.id}
                line={line}
                locale={locale}
                messages={messages}
                isBusy={isBusy}
                onQuantityChange={onQuantityChange}
                onRemove={onRemove}
              />
            ))}
          </ul>

          <div className="text-fg-muted mt-4 flex items-center gap-1.5 text-xs">
            {/*
             * §28.2's durable hold, shown as the time it lapses rather than a
             * ticking countdown: the countdown would imply the browser is what
             * frees the stock, and §7.3 is explicit that expiry is applied at
             * read time on the server whether this tab is open or not.
             *
             * The explanation beside it is not decoration. "Held until 2:51 PM"
             * states a time without saying what happens AT it, and the three
             * readings a customer flips between — do they leave my bag, do they
             * just go out of stock, are they actually reserved — have three
             * different answers. The popover gives all three.
             */}
            <p>
              {formatTemplate(t.heldUntil, {
                time: new Date(summary.lines[0]?.reservationExpiresAt ?? '').toLocaleTimeString(
                  locale,
                  { hour: '2-digit', minute: '2-digit' },
                ),
              })}
            </p>

            <InfoPopover
              label={t.heldInfoLabel}
              title={t.heldInfoTitle}
              closeLabel={messages.common.close}
            >
              <p>{t.heldInfoReserved}</p>
              <p>{t.heldInfoExpiry}</p>
              <p>{t.heldInfoAction}</p>
              <p>{t.heldInfoExtend}</p>
            </InfoPopover>
          </div>
        </>
      )}
    </>
  );
}
