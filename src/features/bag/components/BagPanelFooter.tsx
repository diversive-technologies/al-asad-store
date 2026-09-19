'use client';

import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import type { BagSummary } from '../schemas/bag.schema';
import { BagTotals } from './BagTotals';

export interface BagPanelFooterProps {
  summary: BagSummary;
  locale: Locale;
  messages: Messages;
}

/**
 * The slide-in bag's footer: the totals and the way on to checkout.
 *
 * Its own module so the panel can load it on first open with the contents
 * rather than on every page (`BagPanel` has the reason).
 */
export function BagPanelFooter({ summary, locale, messages }: BagPanelFooterProps) {
  return (
    <div className="flex flex-col gap-3">
      <BagTotals summary={summary} locale={locale} messages={messages} />
      {/*
       * A LINK, not a button: checkout is a page with its own address
       * that must be openable in a new tab and reachable by the back
       * button (A11Y-01). No `onClick` to dismiss the panel either — the
       * provider already closes it on a pathname change.
       */}
      <ButtonLink href={ROUTES.checkout} variant="primary" size="lg" className="w-full">
        {messages.bag.checkout}
      </ButtonLink>
    </div>
  );
}
