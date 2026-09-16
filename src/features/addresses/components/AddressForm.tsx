'use client';

import { useRef, type FormEvent } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { CLIENT } from '@/config/client';
import type { Messages } from '@/i18n/messages/en';
import { addressDetailSchema, type AddressDetail } from '@/lib/domain/address';
import { formatTemplate } from '@/lib/utils/format';

export interface AddressFormProps {
  messages: Messages;
  /** The address being corrected, or undefined when one is being added. */
  initial?: AddressDetail | undefined;
  /** Answers true once the book has taken it, so the caller can close the form. */
  onSave: (address: AddressDetail) => Promise<boolean>;
  onCancel: () => void;
}

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
  const c = messages.checkout;
  // FORM-06, synchronously: `isSubmitting` only flips after a re-render.
  const inFlight = useRef(false);

  const form = useForm<AddressDetail>({
    resolver: zodResolver(addressDetailSchema),
    defaultValues: initial ?? EMPTY,
  });
  const { errors } = form.formState;

  async function submit(address: AddressDetail): Promise<void> {
    const saved = await onSave(address);
    // Kept on a refusal, so nothing typed is lost while the caller says why.
    if (saved) form.reset(EMPTY);
  }

  /* FORM-06, and the `.finally` is load-bearing: `handleSubmit(...)()` settles
     on every path, so a failed validation cannot leave the latch stuck. */
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    if (inFlight.current) {
      event.preventDefault();
      return;
    }

    inFlight.current = true;
    void form
      .handleSubmit(submit)(event)
      .finally(() => {
        inFlight.current = false;
      });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field
        id="recipientName"
        label={t.recipientLabel}
        hint={t.recipientHint}
        error={errors.recipientName === undefined ? undefined : c.nameInvalid}
      >
        {(aria) => <Input {...aria} autoComplete="name" {...form.register('recipientName')} />}
      </Field>

      <Field
        id="recipientMobile"
        label={c.mobileLabel}
        error={
          errors.recipientMobile === undefined
            ? undefined
            : formatTemplate(c.mobileInvalid, { example: CLIENT.market.mobile.example })
        }
      >
        {(aria) => (
          <Input
            {...aria}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            /* D5 — the example comes from the client profile, beside the pattern
               that validates it, so the two cannot drift. */
            placeholder={CLIENT.market.mobile.example}
            {...form.register('recipientMobile')}
          />
        )}
      </Field>

      <Field
        id="line"
        label={c.addressLabel}
        error={errors.line === undefined ? undefined : c.addressInvalid}
      >
        {(aria) => (
          <Input
            {...aria}
            autoComplete="street-address"
            placeholder={c.addressPlaceholder}
            {...form.register('line')}
          />
        )}
      </Field>

      <Field
        id="city"
        label={c.cityLabel}
        error={errors.city === undefined ? undefined : c.cityInvalid}
      >
        {(aria) => <Input {...aria} autoComplete="address-level2" {...form.register('city')} />}
      </Field>

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
