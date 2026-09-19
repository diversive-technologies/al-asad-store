import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';
import { ur } from '@/i18n/messages/ur';

import { NotFoundState } from './NotFoundState';

/**
 * TEST-08 — BUG-12: with no `not-found.tsx`, a stale product link rendered Next's
 * own English 404 even on an Urdu page, with no way back, and the store's written
 * not-found copy was never shown.
 */
describe('the store’s not-found page', () => {
  it.each([
    ['English', en],
    ['Urdu', ur],
  ])('says it in %s, as the page heading, with a way back', (_language, messages) => {
    const markup = renderToStaticMarkup(
      <NotFoundState
        heading={messages.product.notFoundHeading}
        body={messages.product.notFoundBody}
      >
        <span>{messages.product.backToCatalogue}</span>
      </NotFoundState>,
    );

    expect(markup).toContain(
      `<h1 class="text-fg text-2xl font-semibold">${messages.product.notFoundHeading}</h1>`,
    );
    expect(markup).toContain(messages.product.notFoundBody);
    expect(markup).toContain(messages.product.backToCatalogue);
    expect(markup).not.toContain('<main');
  });

  it.each([
    ['the site', en.notFound.heading, ur.notFound.heading],
    ['an order', en.order.notFoundBody, ur.order.notFoundBody],
  ])('has its own Urdu for %s', (_label, english, urdu) => {
    expect(urdu.length).toBeGreaterThan(0);
    expect(urdu).not.toBe(english);
  });
});
