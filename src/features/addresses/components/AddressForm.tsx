'use client';

import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { useLatchedSubmit } from '@/hooks/use-latched-submit';
import type { Messages } from '@/i18n/messages/en';
import type { AddressDetail } from '@/lib/domain/address';
import { onDemandResolver } from '@/lib/utils/on-demand-resolver';

import { AddressFields } from './AddressFields';

export interface AddressFormProps {
  messages: Messages;
  /** The address being corrected, or undefined when one is being added. */
  initial?: AddressDetail | undefined;
  /** Answers true once the book has taken it, so the caller can close the form. */
  onSave: (address: AddressDetail) => Promise<boolean>;
  onCancel: () => void;
}

/*
 * Deliberate code split (IMP-01a, PERF-10): the form's validation is fetched when
 * it is first focused rather than with the page (`onDemandResolver` has the
 * reasoning).
 */
const validation = onDemandResolver<AddressDetail>(() =>
  Promise.all([import('@hookform/resolvers/zod'), import('@/lib/domain/address')]).then(
    ([{ zodResolver }, { addressDetailSchema }]) => zodResolver(addressDetailSchema),
  ),
);

const EMPTY: AddressDetail = { recipientName: '', recipientMobile: '', line: '', city: '' };

/**
 * One address, added or corrected.
 *
 * FORM-01/FORM-02: the schema is `lib/domain/address.ts` — the same four rules
 * checkout validates against — so a book cannot come to hold an address
 * checkout would refuse.
 *
 * No error summary, unlike the studio: four fields fit on one screen and the
 * first bad one taking focus says everything a summary would. That is the auth
 * forms' convention and this is an auth-shaped form.
 */
export function AddressForm({ messages, initial, onSave, onCancel }: AddressFormProps) {
  const t = messages.account;

  const form = useForm<AddressDetail>({
    resolver: validation.resolver,
    defaultValues: initial ?? EMPTY,
  });

  // FORM-06: one submission at a time, released however validation went.
  const handleSubmit = useLatchedSubmit(form, async (address) => {
    const saved = await onSave(address);
    // Kept on a refusal, so nothing typed is lost while the caller says why.
    if (saved) form.reset(EMPTY);
  });

  return (
    <form
      onSubmit={handleSubmit}
      onFocus={validation.warmUp}
      noValidate
      className="flex flex-col gap-4"
    >
      <AddressFields form={form} messages={messages} />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" isLoading={form.formState.isSubmitting}>
          {initial === undefined ? t.addressAdd : t.addressSaveChanges}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {messages.common.cancel}
        </Button>
      </div>
    </form>
  );
}
