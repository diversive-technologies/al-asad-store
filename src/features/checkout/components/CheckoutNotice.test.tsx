import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';

import { CheckoutNotice } from './CheckoutNotice';

/**
 * TEST-08 — BUG-10: with the store unreachable, checkout said "There is nothing
 * to check out — your bag is empty" to a customer holding a full bag. The reader
 * now tells the two apart (`checkout-browser.test.ts`); this pins what each says.
 */
describe('CheckoutNotice', () => {
  const noop = (): void => undefined;

  it('says the store could not be reached, and never that the bag is empty', () => {
    const markup = renderToStaticMarkup(
      <CheckoutNotice kind="UNREACHABLE" messages={en} onRetry={noop} />,
    );

    expect(markup).toContain(en.checkout.unreachableTitle);
    expect(markup).toContain(en.common.retry);
    expect(markup).not.toContain(en.checkout.emptyBody);
  });

  it('says there is nothing to check out when the bag is genuinely empty', () => {
    const markup = renderToStaticMarkup(
      <CheckoutNotice kind="EMPTY" messages={en} onRetry={noop} />,
    );

    expect(markup).toContain(en.checkout.emptyTitle);
    expect(markup).not.toContain(en.checkout.unreachableTitle);
  });
});
