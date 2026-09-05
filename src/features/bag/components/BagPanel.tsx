'use client';

import { ButtonLink } from '@/components/ui/button';
import { SlideOver } from '@/components/ui/dialog';
import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import { BagContents } from './BagContents';
import { BagTotals } from './BagTotals';
import { useBag } from './BagProvider';

export interface BagPanelProps {
  locale: Locale;
  messages: Messages;
}

/**
 * §28.2's slide-in bag panel.
 *
 * Mounted once, in the root layout, rather than per page — it is opened from
 * the header on every route and from the buy box on a product page, and two
 * instances would mean two dialogs fighting over the top layer.
 *
 * The contents are shared with the `/bag` page (`BagContents`); this file is
 * the dialog around them and the footer that carries the totals.
 */
export function BagPanel({ locale, messages }: BagPanelProps) {
  const t = messages.bag;
  const { isOpen, close, bag } = useBag();

  const summary = bag.data;

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={close}
      title={t.title}
      closeLabel={t.close}
      footer={
        summary === undefined || summary.lines.length === 0 ? undefined : (
          <div className="flex flex-col gap-3">
            <BagTotals summary={summary} locale={locale} messages={messages} />
            {/*
             * A LINK, not a button: checkout is a page with its own address
             * that must be openable in a new tab and reachable by the back
             * button (A11Y-01). No `onClick` to dismiss the panel either — the
             * provider already closes it on a pathname change.
             */}
            <ButtonLink href={ROUTES.checkout} variant="primary" size="lg" className="w-full">
              {t.checkout}
            </ButtonLink>
          </div>
        )
      }
    >
      <BagContents locale={locale} messages={messages} />
    </SlideOver>
  );
}
