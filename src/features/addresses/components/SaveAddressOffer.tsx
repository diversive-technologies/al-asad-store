'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useSession } from '@/features/auth';
import type { Messages } from '@/i18n/messages/en';
import type { AddressDetail } from '@/lib/domain/address';

import { useAddresses } from '../hooks/use-addresses';
import { holdsAddress } from '../lib/address-detail';
import { addressRefusal } from '../lib/address-refusal';

export interface SaveAddressOfferProps {
  address: AddressDetail;
  messages: Messages;
}

/**
 * "Save this address for next time", after an order.
 *
 * §7.2's own reasoning puts this OUTSIDE the placement transaction: the eight
 * steps have no address step, and step 7–8's rule is that external and
 * non-critical work cannot be allowed to roll back a paid order. So the order
 * is placed first, and only then is the customer asked.
 *
 * It draws nothing for a guest — there is no book to save into — and nothing
 * once the book already holds the same address, so nobody is invited to save a
 * second copy of what they picked from the picker a minute earlier.
 *
 * NOT until the book is known, either. `addresses` is empty until the read lands,
 * so drawing the offer before then invites a save of an address the customer
 * already has — and this page is bookmarkable by design, so a cold load is a
 * first-class path rather than an edge.
 */
export function SaveAddressOffer({ address, messages }: SaveAddressOfferProps) {
  const t = messages.account;
  const { isSignedIn } = useSession();
  const book = useAddresses();
  const [saved, setSaved] = useState(false);

  if (!isSignedIn || !book.isReady) return null;
  if (holdsAddress(book.addresses, address) && !saved) return null;

  if (saved) {
    /* A11Y-05: the outcome is announced, because the button it replaces was
       what the customer was looking at. */
    return (
      <p role="status" className="text-fg-muted mt-2 text-sm">
        {t.addressSaved}
      </p>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="mt-2"
        isLoading={book.isChanging}
        onClick={() => {
          void book.save(address).then((ok) => {
            setSaved(ok);
          });
        }}
      >
        {t.addressSaveOffer}
      </Button>

      {/*
       * A11Y-05 / ERR-04 — a refusal is ANNOUNCED. Without this the button span
       * for a moment and came back exactly as it was: a customer whose book is
       * full pressed it, nothing happened, and the one sentence written for
       * that ("Remove one to add another") was reachable only from a page they
       * were not on.
       */}
      <p role="alert" className="text-danger-500 mt-2 text-sm empty:hidden">
        {book.failure === null ? null : addressRefusal(book.failure, t)}
      </p>
    </>
  );
}
