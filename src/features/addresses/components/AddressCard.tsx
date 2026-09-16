'use client';

import { Button } from '@/components/ui/button';
import type { Messages } from '@/i18n/messages/en';

import type { SavedAddress } from '../schemas/address.schema';

export interface AddressCardProps {
  address: SavedAddress;
  messages: Messages;
  isBusy: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onMakeDefault: () => void;
}

/**
 * One saved address, with what can be done to it.
 *
 * The default is said in WORDS rather than marked with a tint (A11Y-06): which
 * address checkout will offer is a fact the customer needs, and a colour is not
 * a fact anybody can read aloud.
 */
export function AddressCard({
  address,
  messages,
  isBusy,
  onEdit,
  onRemove,
  onMakeDefault,
}: AddressCardProps) {
  const t = messages.account;

  return (
    <li className="border-border rounded-card flex flex-col gap-3 border p-4">
      <div className="flex flex-col gap-0.5">
        <p className="text-fg font-medium">
          <bdi>{address.recipientName}</bdi>
          {/*
           * The SPACE is load-bearing. A margin separates the two on screen and
           * not in the text, so a screen reader ran the name into the mark —
           * “Ali Razaطے شدہ” — and in Urdu a Latin name butts straight into
           * Nastaliq with nothing between them.
           */}
          {address.isDefault ? (
            <>
              {' '}
              <span className="text-fg-muted ms-1 text-xs font-normal">{t.addressDefaultMark}</span>
            </>
          ) : null}
        </p>
        {/* I18N-04 — `bdi` keeps a Latin street inside an Urdu paragraph from
            reordering, and a Pakistani address mixes scripts as a matter of course. */}
        <p className="text-fg-muted text-sm">
          <bdi>{address.line}</bdi>
        </p>
        <p className="text-fg-muted text-sm">
          <bdi>{address.city}</bdi>
        </p>
        <p className="text-fg-muted text-sm">
          <bdi>{address.recipientMobile}</bdi>
        </p>
      </div>

      {/*
       * , NOT . Disabling the control somebody just pressed
       * takes focus off it and drops it on the body — the same defect the
       * studio's Check and Save buttons were fixed for. A second press while
       * one change is in flight is refused by the hook's own latch instead.
       */}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={onEdit} aria-busy={isBusy}>
          {t.addressEdit}
        </Button>
        {address.isDefault ? null : (
          <Button type="button" variant="secondary" onClick={onMakeDefault} aria-busy={isBusy}>
            {t.addressMakeDefault}
          </Button>
        )}
        {/* D6 — this records a removal. The address stays on file against the
            orders that went to it; it simply stops being offered. */}
        <Button type="button" variant="ghost" onClick={onRemove} aria-busy={isBusy}>
          {t.addressRemove}
        </Button>
      </div>
    </li>
  );
}
