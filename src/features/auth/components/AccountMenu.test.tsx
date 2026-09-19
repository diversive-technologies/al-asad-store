import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';

import { AccountMenu } from './AccountMenu';
import { PasswordResetSent } from './PasswordResetSent';
import { SessionProvider } from './SessionProvider';

/*
 * F10 — the sign-out's "You have signed out." is said in a status line that is
 * ALREADY in the page when the words arrive: one inserted with its words in it
 * is not reliably announced, and signing out replaces the whole control.
 */
describe('the header account control, signed out', () => {
  const markup = renderToStaticMarkup(
    <SessionProvider session={null}>
      <AccountMenu messages={en} />
    </SessionProvider>,
  );

  it('keeps an empty status line mounted for the sign-out to be said in', () => {
    expect(markup).toContain('<span role="status" class="sr-only"></span>');
  });

  it('is the sign-in link that focus lands on', () => {
    expect(markup).toContain(`aria-label="${en.auth.signInCta}"`);
  });
});

/*
 * F9 — the reset form unmounts with its pressed button, so the confirmation takes
 * focus itself, which is also what reads it out: focusable by the page, never in
 * the tab order.
 */
describe('the password reset confirmation', () => {
  it('is a status line the page can focus', () => {
    const markup = renderToStaticMarkup(<PasswordResetSent messages={en} />);

    expect(markup).toContain(`<p role="status" tabindex="-1" class="text-fg text-sm">`);
    expect(markup).toContain(en.auth.resetSent);
  });
});
