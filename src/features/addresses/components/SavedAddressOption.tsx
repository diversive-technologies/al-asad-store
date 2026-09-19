'use client';

import type { Messages } from '@/i18n/messages/en';
import { formatTemplate } from '@/lib/utils/format';

import type { SavedAddress } from '../schemas/address.schema';

export interface SavedAddressOptionProps {
  address: SavedAddress;
  isChosen: boolean;
  onChoose: () => void;
  messages: Messages;
}

/** One saved address in the checkout picker: a radio, the recipient, and the place. */
export function SavedAddressOption({
  address,
  isChosen,
  onChoose,
  messages,
}: SavedAddressOptionProps) {
  return (
    <label className="hover:bg-surface-muted flex cursor-pointer items-start gap-3 rounded p-2">
      <input
        type="radio"
        name="savedAddress"
        className="mt-1"
        checked={isChosen}
        onChange={onChoose}
      />
      <span className="text-fg text-sm">
        {/* I18N-04 — `bdi`, because an address here mixes scripts. */}
        <bdi>{address.recipientName}</bdi>
        {/* The space, not only the margin — see `AddressCard`. */}
        {address.isDefault ? (
          <>
            {' '}
            <span className="text-fg-muted ms-1 text-xs">
              {messages.account.addressDefaultMark}
            </span>
          </>
        ) : null}
        {/* I18N-01 / I18N-06 — one message, so the separator is the language's
            own: a Latin comma in English, `،` in Urdu. */}
        <span className="text-fg-muted block">
          <bdi>
            {formatTemplate(messages.account.addressInline, {
              line: address.line,
              city: address.city,
            })}
          </bdi>
        </span>
      </span>
    </label>
  );
}
