import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';

import { BagFreeDelivery } from './BagFreeDelivery';

/**
 * TEST-08 — F7: the progress bar was named "You have free delivery" whatever it
 * showed, so a screen reader heard "Spend Rs 10,000 more for free delivery" and
 * then "You have free delivery, progress bar, 33%". Its name is now true either
 * way, and the sentence above it says which.
 */

/** The progress bar's opening tag. */
function barOf(markup: string): string {
  return markup.split('<div').find((tag) => tag.includes('role="progressbar"')) ?? '';
}

describe('BagFreeDelivery', () => {
  it.each([
    { label: 'not yet earned', isMet: false, remainingMinor: 1_000_000 },
    { label: 'earned', isMet: true, remainingMinor: 0 },
  ])('names the bar the same, true thing when free delivery is $label', (progress) => {
    const markup = renderToStaticMarkup(
      <BagFreeDelivery
        freeDelivery={{ thresholdMinor: 1_500_000, ...progress }}
        locale="en"
        messages={en}
      />,
    );

    expect(barOf(markup)).toContain(`aria-label="${en.bag.freeDeliveryProgressLabel}"`);
    expect(barOf(markup)).not.toContain(en.bag.freeDeliveryMet);
  });
});
