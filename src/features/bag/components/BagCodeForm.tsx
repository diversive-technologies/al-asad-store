'use client';

import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Messages } from '@/i18n/messages/en';

import { useBagCode } from '../hooks/use-bag-code';
import type { AppliedCode } from '../schemas/bag.schema';

export interface BagCodeFormProps {
  appliedCode: AppliedCode | null;
  messages: Messages;
}

/**
 * §28.2's promotional code: enter one, or lift the one applied.
 *
 * The field's id comes from `useId`: the panel and the `/bag` page both draw
 * this form, and a fixed id put two `bag-code` fields in one document, so a
 * label could name the other surface's input (FORM-05).
 *
 * Apply is busy but ENABLED — the latch in `useBagCode` refuses a second press —
 * and a code applied or lifted is SAID in a status line that is always mounted,
 * so the announcement is heard when its text arrives (§30.3). The control that
 * replaces the one pressed takes focus (`takeFocus`).
 */
export function BagCodeForm({ appliedCode, messages }: BagCodeFormProps) {
  const t = messages.bag;
  const { change, isPending, rejection, status, takeFocus } = useBagCode(messages);
  const fieldId = useId();
  const errorId = `${fieldId}-error`;

  return (
    <>
      {appliedCode === null ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get('code');
            if (typeof value === 'string' && value.trim().length > 0) change(value.trim());
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1">
            {/* FORM-05: labelled, and the error is associated with the field. */}
            <label htmlFor={fieldId} className="text-fg-muted mb-1 block text-xs">
              {t.promoLabel}
            </label>
            <Input
              ref={takeFocus}
              id={fieldId}
              name="code"
              placeholder={t.promoPlaceholder}
              aria-invalid={rejection !== null}
              aria-describedby={rejection === null ? undefined : errorId}
            />
          </div>
          <Button type="submit" variant="secondary" isBusy={isPending}>
            {t.promoApply}
          </Button>
        </form>
      ) : (
        <AppliedCodeRow
          appliedCode={appliedCode}
          removeLabel={t.promoRemove}
          onRemove={() => {
            change(null);
          }}
          removeRef={takeFocus}
        />
      )}

      {rejection === null ? null : (
        <p id={errorId} role="alert" className="text-danger-500 text-xs">
          {rejection}
        </p>
      )}

      <p role="status" className="text-fg-muted text-xs empty:hidden">
        {status}
      </p>
    </>
  );
}

export interface AppliedCodeRowProps {
  appliedCode: AppliedCode;
  removeLabel: string;
  onRemove: () => void;
  /** Remove code takes focus when it replaces the form (`useBagCode`). */
  removeRef: (control: HTMLElement | null) => void;
}

/** The code in force, and the way to lift it. Not exported (CMP-02). */
function AppliedCodeRow({ appliedCode, removeLabel, onRemove, removeRef }: AppliedCodeRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-fg-muted">
        {appliedCode.code} · {appliedCode.description}
      </span>
      <button
        ref={removeRef}
        type="button"
        onClick={onRemove}
        className="text-fg-muted hover:text-fg rounded-card focus-visible:ring-brand-500 underline focus-visible:ring-2 focus-visible:outline-none"
      >
        {removeLabel}
      </button>
    </div>
  );
}
