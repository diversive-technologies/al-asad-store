'use client';

import { useRef } from 'react';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatNumber } from '@/lib/utils/format';
import { Minus, Plus } from '@/lib/vendor/icons';

import type { BagLine } from '../schemas/bag.schema';

export interface BagLineQuantityProps {
  line: BagLine;
  /** The count is a number in the page's own digits (I18N-08). */
  locale: Locale;
  messages: Messages;
  isBusy: boolean;
  /** `false` when the change was not sent, because another is in flight. */
  onChange: (line: BagLine, quantity: number) => boolean;
}

const STEP_CLASS =
  'text-fg-muted hover:text-fg focus-visible:ring-brand-500 rounded-full p-1.5 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40 aria-busy:opacity-40';

/**
 * A line's quantity: minus, the count, plus.
 *
 * A11Y-01: real buttons, and the count is text rather than an input, because the
 * only legal moves are plus and minus.
 *
 * While a change is in flight the buttons say so with `aria-busy` and stay
 * ENABLED: a disabled button drops the keyboard focus it holds, which is how
 * pressing + used to send focus to the top of the page. A second press in that
 * window is refused by the synchronous latch in `useBagLineChanges` instead.
 */
export function BagLineQuantity({
  line,
  locale,
  messages,
  isBusy,
  onChange,
}: BagLineQuantityProps) {
  const t = messages.bag;
  const increase = useRef<HTMLButtonElement>(null);

  return (
    <div className="border-border flex items-center rounded-full border">
      <button
        type="button"
        onClick={() => {
          /* Reaching one disables this button, and a disabled button cannot keep
             focus — so focus moves to +, which is always there. */
          const target = line.quantity - 1;
          if (onChange(line, target) && target <= 1) increase.current?.focus();
        }}
        /* A REAL disabled state: quantity never reaches zero, because removal is
           its own call with its own confirmation (§16 keeps them separate too). */
        disabled={line.quantity <= 1}
        aria-busy={isBusy}
        aria-label={t.decrease}
        className={STEP_CLASS}
      >
        <Minus className="h-3.5 w-3.5" aria-hidden />
      </button>

      <span className="text-fg min-w-6 text-center text-sm tabular-nums">
        {formatNumber(line.quantity, locale)}
      </span>

      <button
        ref={increase}
        type="button"
        onClick={() => {
          onChange(line, line.quantity + 1);
        }}
        aria-busy={isBusy}
        aria-label={t.increase}
        className={STEP_CLASS}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
