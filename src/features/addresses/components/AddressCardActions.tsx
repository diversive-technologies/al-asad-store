'use client';

import { Button } from '@/components/ui/button';
import type { Messages } from '@/i18n/messages/en';
import { formatTemplate } from '@/lib/utils/format';

import type { SavedAddress } from '../schemas/address.schema';

export interface AddressCardActionsProps {
  address: SavedAddress;
  messages: Messages;
  isBusy: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onMakeDefault: () => void;
}

/**
 * What can be done to one saved address.
 *
 * A11Y-04 — every card repeats the same three words, so a screen-reader user
 * listing the buttons heard "Edit, Make default, Remove" once per address with
 * nothing saying which one each acts on. Each NAME carries the recipient and the
 * line, and starts with the word on screen, so a voice user who says what they
 * see still reaches it (as `SavedSizeRow` does for its "Forget").
 *
 * `aria-busy`, NOT `disabled`. Disabling the control somebody just pressed takes
 * focus off it and drops it on the body — the same defect the studio's Check and
 * Save buttons were fixed for. A second press while one change is in flight is
 * refused by the hook's own latch instead.
 */
export function AddressCardActions({
  address,
  messages,
  isBusy,
  onEdit,
  onRemove,
  onMakeDefault,
}: AddressCardActionsProps) {
  const t = messages.account;
  const which = { recipient: address.recipientName, line: address.line };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={onEdit}
        aria-busy={isBusy}
        aria-label={formatTemplate(t.addressEditLabel, which)}
      >
        {t.addressEdit}
      </Button>
      {address.isDefault ? null : (
        <Button
          type="button"
          variant="secondary"
          onClick={onMakeDefault}
          aria-busy={isBusy}
          aria-label={formatTemplate(t.addressMakeDefaultLabel, which)}
        >
          {t.addressMakeDefault}
        </Button>
      )}
      {/* D6 — this records a removal. The address stays on file against the
          orders that went to it; it simply stops being offered. */}
      <Button
        type="button"
        variant="ghost"
        onClick={onRemove}
        aria-busy={isBusy}
        aria-label={formatTemplate(t.addressRemoveLabel, which)}
      >
        {t.addressRemove}
      </Button>
    </div>
  );
}
