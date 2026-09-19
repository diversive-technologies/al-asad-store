'use client';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import type { BagLineActions } from '../hooks/use-bag-line-changes';
import type { BagLine } from '../schemas/bag.schema';
import { BagHoldNotice } from './BagHoldNotice';
import { BagLineRow } from './BagLineRow';
import { StitchingNudge } from './StitchingNudge';

export interface BagLineListProps {
  lines: readonly BagLine[];
  /** When the bag's FIRST hold lapses, as the backend stated it (`BagSummary.heldUntil`). */
  heldUntil: string | null;
  locale: Locale;
  messages: Messages;
  isBusy: boolean;
  actions: BagLineActions;
}

/** The lines of a bag that has any, with the hold they share and the stitching nudge. */
export function BagLineList({
  lines,
  heldUntil,
  locale,
  messages,
  isBusy,
  actions,
}: BagLineListProps) {
  /*
   * §7.3's hold is the BACKEND's statement of when the first one lapses (DATA-13).
   * It used to be read off whichever line came first in the list, which named a
   * later time than the one at which something actually left the bag. A bag of
   * only cut garments holds nothing, and says so as `null`.
   */
  return (
    <>
      <ul aria-busy={isBusy}>
        {lines.map((line) => (
          <BagLineRow
            key={line.id}
            line={line}
            locale={locale}
            messages={messages}
            isBusy={isBusy}
            actions={actions}
          />
        ))}
      </ul>

      {heldUntil === null ? null : (
        <BagHoldNotice heldUntil={heldUntil} locale={locale} messages={messages} />
      )}

      <StitchingNudge messages={messages} />
    </>
  );
}
