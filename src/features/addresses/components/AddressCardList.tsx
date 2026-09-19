'use client';

import type { Messages } from '@/i18n/messages/en';

import type { SavedAddress } from '../schemas/address.schema';
import { AddressCard } from './AddressCard';

export interface AddressCardListProps {
  addresses: readonly SavedAddress[];
  messages: Messages;
  isBusy: boolean;
  onEdit: (addressId: string) => void;
  onRemove: (addressId: string) => void;
  onMakeDefault: (addressId: string) => void;
}

/** The book's addresses, one card each — or the sentence that says there are none. */
export function AddressCardList({
  addresses,
  messages,
  isBusy,
  onEdit,
  onRemove,
  onMakeDefault,
}: AddressCardListProps) {
  if (addresses.length === 0) {
    return <p className="text-fg-muted">{messages.account.addressesEmpty}</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {addresses.map((address) => (
        <AddressCard
          key={address.id}
          address={address}
          messages={messages}
          isBusy={isBusy}
          onEdit={() => {
            onEdit(address.id);
          }}
          onRemove={() => {
            onRemove(address.id);
          }}
          onMakeDefault={() => {
            onMakeDefault(address.id);
          }}
        />
      ))}
    </ul>
  );
}
