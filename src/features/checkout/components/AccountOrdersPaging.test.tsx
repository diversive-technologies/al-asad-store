import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';

import { nextOrderHistoryLink } from '../lib/order-history';
import { AccountOrdersPaging } from './AccountOrdersPaging';

/**
 * fixNow 49 — "Show more" on `/account` has to work before any JavaScript has
 * loaded, so it must reach the page as a real link with a real address.
 */
describe('AccountOrdersPaging', () => {
  it('renders "Show more" as a link to the same page showing more', () => {
    const next = nextOrderHistoryLink({ shown: 20, after: null }, 'AA100081');
    const markup = renderToStaticMarkup(
      <AccountOrdersPaging next={next} isPastNewest={false} messages={en} />,
    );

    expect(markup).toContain('<a');
    expect(markup).toContain('href="/account?orders=40#account-order-21"');
    expect(markup).toContain(en.account.ordersShowMore);
    expect(markup).not.toContain('<button');
  });

  it('offers a way back to the newest orders from further back', () => {
    const markup = renderToStaticMarkup(
      <AccountOrdersPaging next={null} isPastNewest messages={en} />,
    );

    expect(markup).toContain('href="/account#account-orders"');
    expect(markup).toContain(en.account.ordersBackToLatest);
  });

  it('draws nothing when the whole history is on the first page', () => {
    const markup = renderToStaticMarkup(
      <AccountOrdersPaging next={null} isPastNewest={false} messages={en} />,
    );

    expect(markup).toBe('');
  });
});
