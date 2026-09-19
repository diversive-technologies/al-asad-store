'use client';

import type { UseFormReturn } from 'react-hook-form';

import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { CLIENT } from '@/config/client';
import type { Messages } from '@/i18n/messages/en';
import type { AddressDetail } from '@/lib/domain/address';
import { formatTemplate } from '@/lib/utils/format';

export interface AddressFieldsProps {
  form: UseFormReturn<AddressDetail>;
  messages: Messages;
}

/**
 * An address's four boxes — who receives it, their mobile, the line and the city —
 * wired through `Field` (FORM-05). The error copy is checkout's own, because the
 * rules are the same four (`lib/domain/address.ts`).
 */
export function AddressFields({ form, messages }: AddressFieldsProps) {
  const t = messages.account;
  const c = messages.checkout;
  const { errors } = form.formState;

  return (
    <>
      <Field
        id="recipientName"
        label={t.recipientLabel}
        hint={t.recipientHint}
        error={errors.recipientName ? c.nameInvalid : undefined}
      >
        {(aria) => <Input {...aria} autoComplete="name" {...form.register('recipientName')} />}
      </Field>

      <Field
        id="recipientMobile"
        label={c.mobileLabel}
        error={
          errors.recipientMobile
            ? formatTemplate(c.mobileInvalid, { example: CLIENT.market.mobile.example })
            : undefined
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

      <Field id="line" label={c.addressLabel} error={errors.line ? c.addressInvalid : undefined}>
        {(aria) => (
          <Input
            {...aria}
            autoComplete="street-address"
            placeholder={c.addressPlaceholder}
            {...form.register('line')}
          />
        )}
      </Field>

      <Field id="city" label={c.cityLabel} error={errors.city ? c.cityInvalid : undefined}>
        {(aria) => <Input {...aria} autoComplete="address-level2" {...form.register('city')} />}
      </Field>
    </>
  );
}
