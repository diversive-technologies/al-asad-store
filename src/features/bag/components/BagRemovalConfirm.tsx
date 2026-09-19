import type { Ref } from 'react';

import type { Messages } from '@/i18n/messages/en';

export interface BagRemovalConfirmProps {
  messages: Messages;
  isBusy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** The Confirm button, which takes focus when the question opens. */
  confirmRef: Ref<HTMLButtonElement>;
}

/**
 * §28.2: "remove with confirmation". Inline rather than a second modal — a dialog
 * on top of a dialog is a focus-management trap, and the destructive action is
 * one line, not a decision needing a page.
 *
 * Confirm stays ENABLED while the removal is in flight and says so with
 * `aria-busy`: disabling it dropped the keyboard focus it held (§30.3). A second
 * press in that window is refused by the latch in `useBagLineChanges`.
 */
export function BagRemovalConfirm({
  messages,
  isBusy,
  onConfirm,
  onCancel,
  confirmRef,
}: BagRemovalConfirmProps) {
  const t = messages.bag;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <p className="text-fg-muted w-full text-xs">{t.removeBody}</p>
      <button
        ref={confirmRef}
        type="button"
        onClick={onConfirm}
        aria-busy={isBusy}
        className="text-danger-500 rounded-card focus-visible:ring-brand-500 text-xs underline focus-visible:ring-2 focus-visible:outline-none aria-busy:opacity-50"
      >
        {t.removeConfirm}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-fg-muted rounded-card focus-visible:ring-brand-500 text-xs underline focus-visible:ring-2 focus-visible:outline-none"
      >
        {t.removeCancel}
      </button>
    </div>
  );
}
