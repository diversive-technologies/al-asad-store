'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { Minus, Plus, Trash2 } from '@/lib/vendor/icons';
import { formatMoneyMinor } from '@/lib/utils/format';

import type { BagLine } from '../schemas/bag.schema';

export interface BagLineRowProps {
  line: BagLine;
  locale: Locale;
  messages: Messages;
  isBusy: boolean;
  onQuantityChange: (line: BagLine, quantity: number) => void;
  onRemove: (line: BagLine) => void;
}

const THUMB_SIZES = '5rem';

/**
 * One line of the bag: §28.2's "per-piece size display, quantity, remove".
 *
 * The per-piece display is not decoration. A three-piece set was sized three
 * times on the product page, and the bag is the last place a customer can catch
 * that they put the shalwar in the wrong size — so all three are listed, from
 * labels the backend authored (I18N-06).
 */
export function BagLineRow({
  line,
  locale,
  messages,
  isBusy,
  onQuantityChange,
  onRemove,
}: BagLineRowProps) {
  const t = messages.bag;
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <li className="border-border flex gap-3 border-b py-4 last:border-b-0">
      <Link
        href={ROUTES.catalogue.detail(line.slug)}
        className="rounded-card bg-surface-muted focus-visible:ring-brand-500 relative size-20 shrink-0 overflow-hidden focus-visible:ring-2 focus-visible:outline-none"
      >
        <Image src={line.imageUrl} alt={line.name} fill sizes={THUMB_SIZES} className="object-cover" />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link href={ROUTES.catalogue.detail(line.slug)} className="text-fg text-sm hover:underline">
            {line.name}
          </Link>
          <span className="text-fg shrink-0 text-sm">
            {formatMoneyMinor(line.lineTotalMinor, locale)}
          </span>
        </div>

        {/* §28.2 per-piece size display. A SIMPLE product has one row here and
            that is correct, not a degenerate case worth branching on. */}
        <ul className="text-fg-muted mt-1 space-y-0.5 text-xs">
          {line.pieces.map((piece) => (
            <li key={piece.pieceId}>
              {piece.name} · {piece.sizeLabel}
            </li>
          ))}
        </ul>

        {isConfirming ? (
          /*
           * §28.2: "remove with confirmation". Inline rather than a second
           * modal — a dialog on top of a dialog is a focus-management trap, and
           * the destructive action is one line, not a decision needing a page.
           */
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-fg-muted w-full text-xs">{t.removeBody}</p>
            <button
              type="button"
              onClick={() => {
                onRemove(line);
              }}
              disabled={isBusy}
              className="text-danger-500 rounded-card focus-visible:ring-brand-500 text-xs underline focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
            >
              {t.removeConfirm}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsConfirming(false);
              }}
              className="text-fg-muted rounded-card focus-visible:ring-brand-500 text-xs underline focus-visible:ring-2 focus-visible:outline-none"
            >
              {t.removeCancel}
            </button>
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-3">
            {/* A11Y-01: real buttons, and the count is text rather than an
                input, because the only legal moves are plus and minus. */}
            <div className="border-border flex items-center rounded-full border">
              <button
                type="button"
                onClick={() => {
                  onQuantityChange(line, line.quantity - 1);
                }}
                /* Quantity never reaches zero: removal is its own call, with
                   its own confirmation (§16 keeps them separate too). */
                disabled={isBusy || line.quantity <= 1}
                aria-label={t.decrease}
                className="text-fg-muted hover:text-fg focus-visible:ring-brand-500 rounded-full p-1.5 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
              >
                <Minus className="h-3.5 w-3.5" aria-hidden />
              </button>

              <span className="text-fg min-w-6 text-center text-sm tabular-nums">
                {line.quantity}
              </span>

              <button
                type="button"
                onClick={() => {
                  onQuantityChange(line, line.quantity + 1);
                }}
                disabled={isBusy}
                aria-label={t.increase}
                className="text-fg-muted hover:text-fg focus-visible:ring-brand-500 rounded-full p-1.5 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsConfirming(true);
              }}
              className="text-fg-muted hover:text-danger-500 focus-visible:ring-brand-500 rounded-card inline-flex items-center gap-1 text-xs focus-visible:ring-2 focus-visible:outline-none"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              {t.remove}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
