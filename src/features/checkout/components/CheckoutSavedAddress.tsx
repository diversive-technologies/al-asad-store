'use client';

import { useCallback, useState } from 'react';

import { useWatch, type UseFormReturn } from 'react-hook-form';

import { SavedAddressPicker } from '@/features/addresses/contract';
import { useSession } from '@/features/auth';
import type { Messages } from '@/i18n/messages/en';
import type { AddressDetail } from '@/lib/domain/address';

import type { CheckoutFormInput } from '../schemas/checkout.schema';

/** The four form fields a saved address fills, in the order the picker sets them. */
const FILLED = ['contactName', 'contactMobile', 'addressLine', 'addressCity'] as const;

export interface CheckoutSavedAddressProps {
  form: UseFormReturn<CheckoutFormInput>;
  messages: Messages;
}

/**
 * "Use a saved address", at the top of §28.2's single page.
 *
 * ABOVE the contact fields rather than beside the address ones, because a saved
 * address fills the recipient's name and number too — §6.5 snapshots all four
 * onto the order together.
 *
 * Nothing is drawn for a GUEST. Checkout is guest-capable by design (§28.2) and
 * the page a guest sees is exactly the page they saw before this existed.
 *
 * Which address is MARKED is derived from the form rather than remembered: edit
 * a filled field and the radio clears, because at that moment the form no longer
 * holds that address (STATE-02). Saying otherwise would be the interface
 * claiming the order goes somewhere it does not.
 */
export function CheckoutSavedAddress({ form, messages }: CheckoutSavedAddressProps) {
  const { isSignedIn } = useSession();
  const [applied, setApplied] = useState<{ id: string; detail: AddressDetail } | null>(null);

  /* `useWatch`, not `form.watch()`: the latter makes React Compiler skip
     memoising this whole component. */
  const [contactName, contactMobile, addressLine, addressCity] = useWatch({
    control: form.control,
    name: FILLED,
  });

  const apply = useCallback(
    (address: AddressDetail, id: string) => {
      setApplied({ id, detail: address });
      form.setValue('contactName', address.recipientName);
      form.setValue('contactMobile', address.recipientMobile);
      form.setValue('addressLine', address.line);
      form.setValue('addressCity', address.city);
      /*
       * `setValue` dispatches no change event, so `reValidateMode: 'onChange'`
       * never fires — errors from an earlier submit would sit over four fields
       * that had just been filled correctly. Judge them again, and only once
       * the customer has actually asked, so a form nobody has submitted still
       * does not scold.
       */
      if (form.formState.isSubmitted) void form.trigger([...FILLED]);
    },
    [form],
  );

  if (!isSignedIn) return null;

  const stillChosen =
    applied !== null &&
    applied.detail.recipientName === contactName &&
    applied.detail.recipientMobile === contactMobile &&
    applied.detail.line === addressLine &&
    applied.detail.city === addressCity;

  /* Untouched means all four are still empty. `formState.isDirty` would answer
     for the WHOLE form, so picking a delivery option first would count as having
     typed an address. */
  const untouched =
    contactName === '' && contactMobile === '' && addressLine === '' && addressCity === '';

  return (
    <SavedAddressPicker
      messages={messages}
      onChoose={apply}
      chosenId={stillChosen ? applied.id : null}
      canPrefill={untouched}
    />
  );
}
