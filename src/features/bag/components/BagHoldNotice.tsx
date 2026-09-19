'use client';

import { InfoPopover } from '@/components/ui/popover';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatTemplate } from '@/lib/utils/format';

export interface BagHoldNoticeProps {
  /** When the FIRST hold in the bag lapses, as the backend stated it. */
  heldUntil: string;
  locale: Locale;
  messages: Messages;
}

/**
 * §28.2's durable hold, shown as the time it lapses rather than a ticking
 * countdown: the countdown would imply the browser is what frees the stock, and
 * §7.3 is explicit that expiry is applied at read time on the server whether this
 * tab is open or not.
 *
 * The explanation beside it is not decoration. "Held until 2:51 PM" states a time
 * without saying what happens AT it, and the three readings a customer flips
 * between — do they leave my bag, do they just go out of stock, are they actually
 * reserved — have three different answers. The popover gives all three.
 */
export function BagHoldNotice({ heldUntil, locale, messages }: BagHoldNoticeProps) {
  const t = messages.bag;

  return (
    <div className="text-fg-muted mt-4 flex items-center gap-1.5 text-xs">
      <p>
        {formatTemplate(t.heldUntil, {
          time: new Date(heldUntil).toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
          }),
        })}
      </p>

      <InfoPopover
        label={t.heldInfoLabel}
        title={t.heldInfoTitle}
        closeLabel={messages.common.close}
      >
        <p>{t.heldInfoReserved}</p>
        <p>{t.heldInfoExpiry}</p>
        <p>{t.heldInfoAction}</p>
        <p>{t.heldInfoExtend}</p>
      </InfoPopover>
    </div>
  );
}
