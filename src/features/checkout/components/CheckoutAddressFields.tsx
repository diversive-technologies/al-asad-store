'use client';

import type { UseFormReturn } from 'react-hook-form';

import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { Messages } from '@/i18n/messages/en';

import type { CheckoutFormInput } from '../schemas/checkout.schema';

export interface CheckoutAddressFieldsProps {
  form: UseFormReturn<CheckoutFormInput>;
  messages: Messages;
}

/**
 * Where the order goes.
 *
 * Two fields, because that is what an address is in this market: there is no
 * postcode, and §6.5 snapshots exactly `delivery_address` and `delivery_city`
 * onto the order. The rules behind them live in `lib/domain/address.ts`, which
 * the saved address book validates against too, so a book cannot come to hold
 * an address checkout would refuse.
 */
export function CheckoutAddressFields({ form, messages }: CheckoutAddressFieldsProps) {
  const t = messages.checkout;
  const { errors } = form.formState;

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-fg mb-2 text-lg font-medium">{t.addressHeading}</legend>

      <Field
        id="addressLine"
        label={t.addressLabel}
        error={errors.addressLine === undefined ? undefined : t.addressInvalid}
      >
        {(aria) => (
          <Input
            {...aria}
            autoComplete="street-address"
            placeholder={t.addressPlaceholder}
            {...form.register('addressLine')}
          />
        )}
      </Field>

      <Field
        id="addressCity"
        label={t.cityLabel}
        error={errors.addressCity === undefined ? undefined : t.cityInvalid}
      >
        {(aria) => (
          <Input {...aria} autoComplete="address-level2" {...form.register('addressCity')} />
        )}
      </Field>
    </fieldset>
  );
}
