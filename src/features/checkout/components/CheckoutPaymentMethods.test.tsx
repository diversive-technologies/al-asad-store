import { renderToStaticMarkup } from 'react-dom/server';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';

import {
  paymentMethodSchema,
  type CheckoutFormInput,
  type PaymentMethod,
} from '../schemas/checkout.schema';
import { CheckoutPaymentMethods } from './CheckoutPaymentMethods';

/**
 * TEST-08 — BUG-08: pressing Place order without choosing a payment method
 * showed "Not available for this order", the words for a method the backend
 * refused, to a customer who had simply not picked one.
 */

const METHODS: PaymentMethod[] = [
  {
    id: 'cod',
    label: 'Cash on delivery',
    description: 'Pay the courier',
    isAvailable: true,
    unavailableReason: null,
  },
  {
    id: 'bank',
    label: 'Bank transfer',
    description: 'Transfer the total',
    isAvailable: true,
    unavailableReason: null,
  },
].map((method) => paymentMethodSchema.parse(method));

interface HarnessProps {
  isMissing: boolean;
}

/* `useForm` can only run inside a component; `errors` seeds what a failed submit leaves. */
function Harness({ isMissing }: HarnessProps) {
  const form = useForm<CheckoutFormInput>(
    isMissing ? { errors: { paymentMethodId: { type: 'too_small', message: '' } } } : {},
  );
  return <CheckoutPaymentMethods form={form} methods={METHODS} messages={en} />;
}

describe('CheckoutPaymentMethods', () => {
  it('asks the customer to choose when no method was chosen', () => {
    const markup = renderToStaticMarkup(<Harness isMissing />);

    expect(markup).toContain(en.checkout.methodRequired);
    expect(markup).toContain('role="alert"');
    expect(markup).not.toContain('Not available for this order');
    // FORM-05 — the group is described by the error it shows.
    expect(markup).toMatch(
      /<fieldset[^>]*aria-describedby="([^"]+)"[\s\S]*<p id="\1" role="alert"/,
    );
  });

  it('shows no error before anything was submitted', () => {
    const markup = renderToStaticMarkup(<Harness isMissing={false} />);

    expect(markup).not.toContain('role="alert"');
    expect(markup).not.toContain('aria-describedby');
  });
});
