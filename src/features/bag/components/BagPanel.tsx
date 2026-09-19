'use client';

import { useState } from 'react';

import { LoadingNotice } from '@/components/shared/LoadingNotice';
import { OnDemand } from '@/components/shared/OnDemand';
import { SlideOver } from '@/components/ui/dialog';
import { onDemandPart } from '@/hooks/use-on-demand';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import { useBag } from './BagProvider';

/*
 * Deliberate code split (IMP-01a, PERF-06, PERF-10). The panel is mounted in
 * the root layout, so everything inside it — every kind of bag line, the
 * quantity and removal controls, the promotional code form, the totals — was
 * first-load JavaScript on every route, for a surface most page views never
 * open. The dialog itself stays here, so the bag button opens it at once; what
 * goes inside is fetched the first time it is opened, or earlier when the
 * customer reaches for the bag button or presses Add to bag (`preloadBagPanel`).
 *
 * The contents and the footer are ONE download, so they arrive — or fail —
 * together. A failure is said inside the panel, with Try again, and the store
 * around it stays (`useOnDemand`); a closed `<dialog>` renders nothing a first
 * paint needs, so nothing here is drawn on the server.
 */
const panelParts = onDemandPart(() =>
  Promise.all([import('./BagContents'), import('./BagPanelFooter')]).then(([contents, footer]) => ({
    ...contents,
    ...footer,
  })),
);

/** Starts the panel's download early; a second call is free, the modules are cached. */
export function preloadBagPanel(): void {
  panelParts.warm();
}

/* The contents' own notice says it; the footer has nothing to add. */
function noFooter(): null {
  return null;
}

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
 * the dialog around them. Neither the contents nor the footer is rendered until
 * the panel is first opened, and both stay rendered afterwards, so the panel
 * behaves as it always did from the second opening on. `hasOpened` is adjusted
 * during render, not in an effect, for the reason `useBagPanel` gives.
 */
export function BagPanel({ locale, messages }: BagPanelProps) {
  const t = messages.bag;
  const { isOpen, close, bag } = useBag();
  const [hasOpened, setHasOpened] = useState(isOpen);

  if (isOpen && !hasOpened) setHasOpened(true);

  const summary = bag.data;

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={close}
      title={t.title}
      closeLabel={t.close}
      footer={
        !hasOpened || summary === undefined || summary.lines.length === 0 ? undefined : (
          <OnDemand part={panelParts} failure={noFooter}>
            {(parts) => (
              <parts.BagPanelFooter summary={summary} locale={locale} messages={messages} />
            )}
          </OnDemand>
        )
      }
    >
      {hasOpened ? (
        <OnDemand part={panelParts} loading={<LoadingNotice />}>
          {(parts) => <parts.BagContents locale={locale} messages={messages} />}
        </OnDemand>
      ) : null}
    </SlideOver>
  );
}
