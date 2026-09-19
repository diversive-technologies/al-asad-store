'use client';

import { useId } from 'react';

import type { UseFormReturn } from 'react-hook-form';

import type { Messages } from '@/i18n/messages/en';

import type { CheckoutFormInput, PaymentMethod } from '../schemas/checkout.schema';

export interface CheckoutPaymentMethodsProps {
  form: UseFormReturn<CheckoutFormInput>;
  methods: readonly PaymentMethod[];
  messages: Messages;
}

/**
 * §28.2's payment choice.
 *
 * The thing NOT here is a conditional per payment method. §3.1: "Checkout must
 * not contain a conditional per method" — so the methods are a list the backend
 * sends, each carrying its own label, description and availability, and a fifth
 * method is a configuration entry in Java that changes nothing in this file.
 *
 * The one error this group can show is that nothing was CHOSEN, and it says that.
 * It used to borrow "Not available for this order" — the words for a method the
 * backend refused — which told a customer who had simply not picked one that
 * something was wrong with their order (FORM-05).
 */
export function CheckoutPaymentMethods({ form, methods, messages }: CheckoutPaymentMethodsProps) {
  const t = messages.checkout;
  const errorId = useId();
  const isMissing = form.formState.errors.paymentMethodId !== undefined;

  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={isMissing ? errorId : undefined}>
      <legend className="text-fg mb-2 text-lg font-medium">{t.paymentHeading}</legend>

      {methods.map((method) => (
        <label
          key={method.id}
          className={
            method.isAvailable
              ? 'border-border rounded-card hover:border-brand-600 flex cursor-pointer items-start gap-3 border p-3'
              : 'border-border rounded-card flex items-start gap-3 border p-3 opacity-60'
          }
        >
          <input
            type="radio"
            value={method.id}
            // §17's COD cap, as the backend reported it. Nothing here knows
            // what the cap is, or that a cap is the reason (DATA-13).
            disabled={!method.isAvailable}
            className="accent-brand-600 mt-0.5"
            {...form.register('paymentMethodId')}
          />
          <span className="flex-1">
            <span className="text-fg block text-sm">{method.label}</span>
            <span className="text-fg-muted block text-xs">{method.description}</span>
            {/* A11Y-06: the reason is TEXT, not just a dimmed control. */}
            {method.unavailableReason === null ? null : (
              <span className="text-danger-500 mt-1 block text-xs">{method.unavailableReason}</span>
            )}
          </span>
        </label>
      ))}

      {isMissing ? (
        <p id={errorId} role="alert" className="text-danger-500 text-xs">
          {t.methodRequired}
        </p>
      ) : null}
    </fieldset>
  );
}
