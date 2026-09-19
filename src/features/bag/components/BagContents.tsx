'use client';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import { useBagLineChanges } from '../hooks/use-bag-line-changes';
import { BagEmptyState } from './BagEmptyState';
import { BagLineList } from './BagLineList';
import { BagLinesSkeleton } from './BagLinesSkeleton';
import { useBag } from './BagProvider';

export interface BagContentsProps {
  locale: Locale;
  messages: Messages;
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
  const { bag } = useBag();
  const { actions, isBusy, notice, status, emptyStateRef } = useBagLineChanges(messages, locale);
  const summary = bag.data;

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

      {/* What just happened — a removed line simply vanishes otherwise, and a
          screen-reader user would be told nothing. Polite: it interrupts nothing. */}
      <p role="status" className="text-fg-muted text-sm empty:hidden">
        {status}
      </p>

      {/* NEXT-14 — the lines' own shape while the bag is read, not a bare line of
          text; the wait is said in words beside it, since the shape is hidden. */}
      {bag.isPending ? (
        <>
          <p role="status" className="sr-only">
            {messages.common.loading}
          </p>
          <BagLinesSkeleton />
        </>
      ) : null}

      {bag.isError ? <p className="text-fg-muted text-sm">{t.unreachable}</p> : null}

      {summary === undefined ? null : summary.lines.length === 0 ? (
        <BagEmptyState messages={messages} ref={emptyStateRef} />
      ) : (
        <BagLineList
          lines={summary.lines}
          heldUntil={summary.heldUntil}
          locale={locale}
          messages={messages}
          isBusy={isBusy}
          actions={actions}
        />
      )}
    </>
  );
}
