'use client';

import type { ReactNode } from 'react';

import { Button, ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';

export interface CheckoutNoticeProps {
  /**
   * `EMPTY` — the backend answered, and there is nothing to check out.
   * `UNREACHABLE` — the quote could not be read at all.
   */
  kind: 'EMPTY' | 'UNREACHABLE';
  messages: Messages;
  /** Reads the quote again. Offered only when it could not be read. */
  onRetry: () => void;
  /** What happened just before, when that is why there is nothing to show. */
  children?: ReactNode;
}

/**
 * The two ways checkout has nothing to show, which are two different facts.
 *
 * They used to be one screen: every failed quote read as "There is nothing to
 * check out — your bag is empty", so a store that could not be reached told a
 * customer holding a full bag that it was empty, and sent them browsing instead
 * of trying again. An empty bag offers the catalogue; an unreachable store says so
 * and offers to try again (ERR-02).
 */
export function CheckoutNotice({ kind, messages, onRetry, children }: CheckoutNoticeProps) {
  const t = messages.checkout;
  const isEmpty = kind === 'EMPTY';

  return (
    <section className="page-shell max-w-xl py-16">
      <h1 className="text-fg text-2xl font-semibold">
        {isEmpty ? t.emptyTitle : t.unreachableTitle}
      </h1>
      {children}
      <p role={isEmpty ? undefined : 'alert'} className="text-fg-muted mt-3">
        {isEmpty ? t.emptyBody : t.unreachableBody}
      </p>
      <div className="mt-6">
        {isEmpty ? (
          <ButtonLink href={ROUTES.catalogue.list} variant="primary">
            {t.browse}
          </ButtonLink>
        ) : (
          <Button type="button" variant="primary" onClick={onRetry}>
            {messages.common.retry}
          </Button>
        )}
      </div>
    </section>
  );
}
