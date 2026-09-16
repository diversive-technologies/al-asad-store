'use client';

import type { UseFormReturn } from 'react-hook-form';

import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { Messages } from '@/i18n/messages/en';
import { formatTemplate } from '@/lib/utils/format';

import type { CheckoutFormInput } from '../schemas/checkout.schema';

export interface CheckoutContactFieldsProps {
  form: UseFormReturn<CheckoutFormInput>;
  messages: Messages;
  mobileExample: string;
}

/**
 * Who the order is for, and how the courier reaches them.
 *
 * Through `Field` rather than by hand: FORM-05's label, `aria-invalid` and
 * `aria-describedby` were written out three times here and twice next door, and
 * the primitive exists so forgetting one is impossible.
 */
export function CheckoutContactFields({
  form,
  messages,
  mobileExample,
}: CheckoutContactFieldsProps) {
  const t = messages.checkout;
  const { errors } = form.formState;

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-fg mb-2 text-lg font-medium">{t.contactHeading}</legend>

      <Field
        id="contactName"
        label={t.nameLabel}
        error={errors.contactName === undefined ? undefined : t.nameInvalid}
      >
        {(aria) => <Input {...aria} autoComplete="name" {...form.register('contactName')} />}
      </Field>

      <Field
        id="contactMobile"
        label={t.mobileLabel}
        error={
          errors.contactMobile === undefined
            ? undefined
            : formatTemplate(t.mobileInvalid, { example: mobileExample })
        }
      >
        {(aria) => (
          <Input
            {...aria}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            /* D5: the example comes from the client profile, beside the pattern
               that validates it, so the two cannot drift. */
            placeholder={mobileExample}
            {...form.register('contactMobile')}
          />
        )}
      </Field>

      <Field
        id="contactEmail"
        label={t.emailLabel}
        error={errors.contactEmail === undefined ? undefined : t.emailInvalid}
      >
        {(aria) => (
          <Input {...aria} type="email" autoComplete="email" {...form.register('contactEmail')} />
        )}
      </Field>
    </fieldset>
  );
}
