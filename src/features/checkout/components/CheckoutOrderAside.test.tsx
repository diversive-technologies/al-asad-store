import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';
import { formatMoneyMinor } from '@/lib/utils/format';

import { checkoutQuoteSchema } from '../schemas/checkout.schema';
import { CheckoutOrderAside } from './CheckoutOrderAside';
import { CheckoutSkeleton } from './CheckoutSkeleton';

/**
 * TEST-08 — the checkout's order summary while something is in flight.
 *
 * F12: Place order was DISABLED while placing, which dropped the keyboard focus
 * it held, so a refusal landed on nothing. F5: a re-quote used to replace the
 * whole form with a loading line; the totals now stay, and the summary says it
 * is being re-read.
 */

const QUOTE = checkoutQuoteSchema.parse({
  totals: {
    subtotalMinor: 700_000,
    discountMinor: 0,
    deliveryMinor: 25_000,
    giftMinor: 0,
    totalMinor: 725_000,
  },
  deliveryOptionId: 'standard',
  deliveryOptions: [
    { id: 'standard', label: 'Standard', description: '3 to 5 days', chargeMinor: 25_000 },
  ],
  paymentMethods: [
    {
      id: 'cod',
      label: 'Cash',
      description: 'On arrival',
      isAvailable: true,
      unavailableReason: null,
    },
  ],
  gift: { isOffered: true, chargeMinor: 30_000 },
  madeToMeasure: { isPresent: false, leadTimeDays: 0, hasOtherItems: true },
});

function aside(isPlacing: boolean, isRequoting: boolean): string {
  return renderToStaticMarkup(
    <CheckoutOrderAside
      quote={QUOTE}
      isPlacing={isPlacing}
      isRequoting={isRequoting}
      locale="en"
      messages={en}
    />,
  );
}

/** The submit button's opening tag. */
function placeButton(markup: string): string {
  return markup.split('<button').find((tag) => tag.includes('type="submit"')) ?? '';
}

describe('CheckoutOrderAside', () => {
  it('keeps Place order enabled while placing, and says it is busy', () => {
    const button = placeButton(aside(true, false));

    expect(button).toContain('aria-busy="true"');
    expect(button).not.toContain('disabled=""');
  });

  it('keeps the totals on screen while re-quoting, and marks the summary busy', () => {
    const markup = aside(false, true);

    expect(markup).toMatch(/<aside[^>]*aria-busy="true"/);
    expect(markup).toContain(formatMoneyMinor(725_000, 'en'));
    expect(placeButton(markup)).toContain('aria-busy="true"');
  });
});

describe('CheckoutSkeleton', () => {
  const markup = renderToStaticMarkup(<CheckoutSkeleton label={en.common.loading} />);

  it('says the wait in words, beside a shape a screen reader skips', () => {
    expect(markup).toContain(`<p role="status" class="sr-only">${en.common.loading}</p>`);
    expect(markup).toContain('aria-hidden="true"');
  });

  it('draws the checkout’s own grid, still under reduced motion', () => {
    expect(markup).toContain('lg:grid-cols-[minmax(0,1fr)_22rem]');
    expect(markup).not.toMatch(/(?<!motion-safe:)animate-pulse/);
  });
});
