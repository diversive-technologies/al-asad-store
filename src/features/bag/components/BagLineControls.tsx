'use client';

import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { Trash2 } from '@/lib/vendor/icons';

import type { BagLineActions } from '../hooks/use-bag-line-changes';
import type { BagLine } from '../schemas/bag.schema';
import { BagLineMoveButton } from './BagLineMoveButton';
import { BagLineQuantity } from './BagLineQuantity';
import { BagRemovalConfirm } from './BagRemovalConfirm';

export interface BagLineControlsProps {
  line: BagLine;
  locale: Locale;
  messages: Messages;
  isBusy: boolean;
  actions: BagLineActions;
}

/**
 * A line's quantity, its move into saved items and its removal. Quantity and
 * removal take turns in one place; the move is offered beside them when it can
 * work at all (`BagLineMoveButton`).
 *
 * Swapping the two replaces the button that was pressed, so focus is moved on
 * purpose: to Confirm when the question opens, and back to Remove when it is
 * dismissed. It is moved in the handler, after `flushSync` has put the new button
 * in the document, rather than from an effect that would race the browser's own
 * blur of the button that just left. Whichever of Remove and Confirm is mounted
 * is handed to `useRemovalFocus`, so a removal elsewhere can land on this line.
 *
 * The row WRAPS: the panel leaves a line about 15rem, and quantity, Move and
 * Remove do not always fit on one line of it. Remove comes last, as the one
 * control of the three that gives the garment up.
 */
export function BagLineControls({ line, locale, messages, isBusy, actions }: BagLineControlsProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const removeButton = useRef<HTMLButtonElement | null>(null);
  const confirmButton = useRef<HTMLButtonElement | null>(null);

  function confirming(next: boolean): void {
    flushSync(() => {
      setIsConfirming(next);
    });
    (next ? confirmButton : removeButton).current?.focus();
  }
  if (isConfirming) {
    return (
      <BagRemovalConfirm
        messages={messages}
        isBusy={isBusy}
        onConfirm={() => actions.remove(line)}
        onCancel={() => {
          confirming(false);
        }}
        confirmRef={(control) => {
          confirmButton.current = control;
          actions.registerRemoveControl(line.id, control);
        }}
      />
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      <BagLineQuantity
        line={line}
        locale={locale}
        messages={messages}
        isBusy={isBusy}
        onChange={actions.changeQuantity}
      />
      <BagLineMoveButton
        line={line}
        messages={messages}
        isBusy={isBusy}
        onMove={actions.moveToWishlist}
      />
      <button
        ref={(control) => {
          removeButton.current = control;
          actions.registerRemoveControl(line.id, control);
        }}
        type="button"
        onClick={() => {
          confirming(true);
        }}
        className="text-fg-muted hover:text-danger-500 focus-visible:ring-brand-500 rounded-card inline-flex min-h-6 items-center gap-1 text-xs focus-visible:ring-2 focus-visible:outline-none"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        {messages.bag.remove}
      </button>
    </div>
  );
}
