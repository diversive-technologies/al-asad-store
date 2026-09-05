'use client';

import type { UseFormReturn } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatMoneyMinor, formatTemplate } from '@/lib/utils/format';

import type { CheckoutFormInput, CheckoutQuote } from '../schemas/checkout.schema';

export interface CheckoutFieldsProps {
  form: UseFormReturn<CheckoutFormInput>;
  quote: CheckoutQuote;
  messages: Messages;
  locale: Locale;
  mobileExample: string;
  onDeliveryChange: (id: string) => void;
  onGiftChange: (isGift: boolean) => void;
}

/**
 * Every field of §28.2's single-page checkout.
 *
 * The thing NOT here is a conditional per payment method. §3.1: "Checkout must
 * not contain a conditional per method" — four exist at launch and more will
 * follow, so the methods are a list the backend sends, each carrying its own
 * label, its own description and its own availability. A fifth method is a
 * configuration entry in Java, and this file does not change.
 */
export function CheckoutFields({
  form,
  quote,
  messages,
  locale,
  mobileExample,
  onDeliveryChange,
  onGiftChange,
}: CheckoutFieldsProps) {
  const t = messages.checkout;
  const { register, formState, watch } = form;
  const { errors } = formState;
  const isGift = watch('isGift');

  return (
    <div className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-4">
        <legend className="text-fg mb-2 text-lg font-medium">{t.contactHeading}</legend>

        {/* FORM-05: labelled, with `aria-invalid` and `aria-describedby` wired. */}
        <div className="flex flex-col gap-1">
          <label htmlFor="contactName" className="text-fg text-sm">
            {t.nameLabel}
          </label>
          <Input
            id="contactName"
            autoComplete="name"
            aria-invalid={errors.contactName !== undefined}
            aria-describedby={errors.contactName === undefined ? undefined : 'contactName-error'}
            {...register('contactName')}
          />
          {errors.contactName === undefined ? null : (
            <p id="contactName-error" role="alert" className="text-danger-500 text-xs">
              {t.nameInvalid}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="contactMobile" className="text-fg text-sm">
            {t.mobileLabel}
          </label>
          <Input
            id="contactMobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            // D5: the example comes from the client profile, beside the pattern
            // that validates it, so the two cannot drift.
            placeholder={mobileExample}
            aria-invalid={errors.contactMobile !== undefined}
            aria-describedby={
              errors.contactMobile === undefined ? undefined : 'contactMobile-error'
            }
            {...register('contactMobile')}
          />
          {errors.contactMobile === undefined ? null : (
            <p id="contactMobile-error" role="alert" className="text-danger-500 text-xs">
              {formatTemplate(t.mobileInvalid, { example: mobileExample })}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="contactEmail" className="text-fg text-sm">
            {t.emailLabel}
          </label>
          <Input
            id="contactEmail"
            type="email"
            autoComplete="email"
            aria-invalid={errors.contactEmail !== undefined}
            aria-describedby={errors.contactEmail === undefined ? undefined : 'contactEmail-error'}
            {...register('contactEmail')}
          />
          {errors.contactEmail === undefined ? null : (
            <p id="contactEmail-error" role="alert" className="text-danger-500 text-xs">
              {t.emailInvalid}
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-fg mb-2 text-lg font-medium">{t.addressHeading}</legend>

        <div className="flex flex-col gap-1">
          <label htmlFor="addressLine" className="text-fg text-sm">
            {t.addressLabel}
          </label>
          <Input
            id="addressLine"
            autoComplete="street-address"
            placeholder={t.addressPlaceholder}
            aria-invalid={errors.addressLine !== undefined}
            aria-describedby={errors.addressLine === undefined ? undefined : 'addressLine-error'}
            {...register('addressLine')}
          />
          {errors.addressLine === undefined ? null : (
            <p id="addressLine-error" role="alert" className="text-danger-500 text-xs">
              {t.addressInvalid}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="addressCity" className="text-fg text-sm">
            {t.cityLabel}
          </label>
          <Input
            id="addressCity"
            autoComplete="address-level2"
            aria-invalid={errors.addressCity !== undefined}
            aria-describedby={errors.addressCity === undefined ? undefined : 'addressCity-error'}
            {...register('addressCity')}
          />
          {errors.addressCity === undefined ? null : (
            <p id="addressCity-error" role="alert" className="text-danger-500 text-xs">
              {t.cityInvalid}
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-fg mb-2 text-lg font-medium">{t.deliveryHeading}</legend>

        {quote.deliveryOptions.map((option) => (
          <label
            key={option.id}
            className="border-border rounded-card hover:border-brand-600 flex cursor-pointer items-start gap-3 border p-3"
          >
            <input
              type="radio"
              value={option.id}
              className="accent-brand-600 mt-0.5"
              {...register('deliveryOptionId', {
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                  // Re-quote: the charge changes the total, and the total
                  // decides which payment methods are offered (§17).
                  onDeliveryChange(event.target.value);
                },
              })}
            />
            <span className="flex-1">
              <span className="text-fg block text-sm">{option.label}</span>
              <span className="text-fg-muted block text-xs">{option.description}</span>
            </span>
            <span className="text-fg text-sm">
              {option.chargeMinor === 0
                ? t.deliveryFree
                : formatMoneyMinor(option.chargeMinor, locale)}
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-fg mb-2 text-lg font-medium">{t.paymentHeading}</legend>

        {quote.paymentMethods.map((method) => (
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
              {...register('paymentMethodId')}
            />
            <span className="flex-1">
              <span className="text-fg block text-sm">{method.label}</span>
              <span className="text-fg-muted block text-xs">{method.description}</span>
              {/* A11Y-06: the reason is TEXT, not just a dimmed control. */}
              {method.unavailableReason === null ? null : (
                <span className="text-danger-500 mt-1 block text-xs">
                  {method.unavailableReason}
                </span>
              )}
            </span>
          </label>
        ))}

        {errors.paymentMethodId === undefined ? null : (
          <p role="alert" className="text-danger-500 text-xs">
            {t.methodUnavailable}
          </p>
        )}
      </fieldset>

      {!quote.gift.isOffered ? null : (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-fg mb-2 text-lg font-medium">{t.giftHeading}</legend>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              className="accent-brand-600"
              {...register('isGift', {
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                  onGiftChange(event.target.checked);
                },
              })}
            />
            <span className="text-fg text-sm">{t.giftToggle}</span>
            <span className="text-fg-muted text-xs">
              {formatMoneyMinor(quote.gift.chargeMinor, locale)}
            </span>
          </label>

          {/* Revealed rather than always present: an empty message box on an
              order that is not a gift is a question nobody asked. */}
          {!isGift ? null : (
            <div className="flex flex-col gap-1">
              <label htmlFor="giftMessage" className="text-fg text-sm">
                {t.giftMessageLabel}
              </label>
              <Input
                id="giftMessage"
                placeholder={t.giftMessagePlaceholder}
                maxLength={200}
                {...register('giftMessage')}
              />
            </div>
          )}
        </fieldset>
      )}
    </div>
  );
}
