'use client';

import { useEffect, useRef } from 'react';

import type { Messages } from '@/i18n/messages/en';
import type { AddressDetail } from '@/lib/domain/address';

import { useAddresses } from '../hooks/use-addresses';
import { detailOf } from '../lib/address-detail';
import { SavedAddressOption } from './SavedAddressOption';

export interface SavedAddressPickerProps {
  messages: Messages;
  /** Fills the form's four fields. The caller owns the form and its re-judging. */
  onChoose: (address: AddressDetail, id: string) => void;
  /** Which one is filled in now, so the list can say which it is. */
  chosenId: string | null;
  /**
   * Whether the default may be filled in without asking.
   *
   * False the moment the customer has typed anything, because the book arrives
   * a round trip AFTER the fields are usable: somebody sending a gift who
   * starts typing their aunt's address straight away would otherwise watch all
   * four fields be replaced by their own, a second later, with nothing said.
   */
  canPrefill: boolean;
}

/**
 * "Use a saved address", above the fields it fills.
 *
 * It DRAWS NOTHING for a guest and nothing for a customer with an empty book,
 * which is what keeps checkout unchanged for the people §28.2 is about: a guest
 * checking out sees exactly the page they saw before.
 *
 * The default is applied ONCE, on the first read, and only into an untouched
 * form — a customer who has already typed an address is not overwritten by one
 * arriving from the server a moment later.
 *
 * It is a radio group rather than a select: three addresses are three things to
 * compare, and a select hides two of them behind a tap.
 */
export function SavedAddressPicker({
  messages,
  onChoose,
  chosenId,
  canPrefill,
}: SavedAddressPickerProps) {
  const t = messages.account;
  const book = useAddresses();
  const applied = useRef(false);

  const standing = book.addresses.find((address) => address.isDefault);

  useEffect(() => {
    if (applied.current || standing === undefined) return;
    /*
     * The latch is spent as soon as the book LANDS, whether or not the default
     * was filled in — so a customer who was already typing is not filled in
     * later either, and a re-mount (the quote re-runs when the delivery option
     * or the gift box changes, which unmounts this subtree) cannot re-apply the
     * default over what they have since written.
     */
    applied.current = true;
    if (!canPrefill) return;
    onChoose(detailOf(standing), standing.id);
  }, [standing, canPrefill, onChoose]);

  if (book.addresses.length === 0) return null;

  return (
    <fieldset className="border-border rounded-card flex flex-col gap-2 border p-4">
      <legend className="text-fg px-1 text-sm font-medium">{t.addressUseSaved}</legend>

      {book.addresses.map((address) => (
        <SavedAddressOption
          key={address.id}
          address={address}
          isChosen={chosenId === address.id}
          onChoose={() => {
            onChoose(detailOf(address), address.id);
          }}
          messages={messages}
        />
      ))}

      <p className="text-fg-muted text-xs">{t.addressPickerHint}</p>
    </fieldset>
  );
}
