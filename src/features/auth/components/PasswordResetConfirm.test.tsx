import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import ResetPasswordPage from '../../../../app/reset-password/page';
import { ROUTES } from '@/config/routes';
import { en } from '@/i18n/messages/en';

import { PasswordResetConfirmForm } from './PasswordResetConfirmForm';
import { PasswordResetDone } from './PasswordResetDone';
import { ResetLinkExpired } from './ResetLinkExpired';

/**
 * F-03 — each face the reset page can wear. The page judges the token on the
 * server, so a link that is not ours never gets a form to type a password into.
 */

vi.mock('@/i18n', async () => {
  const { en: messages } = await import('@/i18n/messages/en');
  return { getMessages: () => Promise.resolve(messages) };
});

const TOKEN = 'ab'.repeat(32);

async function renderPage(query: Record<string, string | string[] | undefined>): Promise<string> {
  const page = await ResetPasswordPage({ searchParams: Promise.resolve(query) });
  return renderToStaticMarkup(page);
}

describe('the form face', () => {
  const markup = renderToStaticMarkup(<PasswordResetConfirmForm messages={en} token={TOKEN} />);

  it('asks for the new password twice, as new-password fields a manager can fill', () => {
    expect(markup).toContain(en.auth.newPasswordLabel);
    expect(markup).toContain(en.auth.confirmPasswordLabel);
    expect(markup.match(/autoComplete="new-password"|autocomplete="new-password"/g)).toHaveLength(
      2,
    );
    expect(markup.match(/type="password"/g)).toHaveLength(2);
  });

  it('has the save button and never writes the token into the page', () => {
    expect(markup).toContain(en.auth.resetConfirmCta);
    expect(markup).not.toContain(TOKEN);
  });
});

describe('the done face', () => {
  const markup = renderToStaticMarkup(<PasswordResetDone messages={en} />);

  it('says the password was changed and takes focus, because it replaces the form', () => {
    expect(markup).toContain(`<p role="status" tabindex="-1" class="text-fg text-sm">`);
    expect(markup).toContain(en.auth.resetDone);
  });

  it('leads to sign-in rather than signing the customer in', () => {
    expect(markup).toContain(`href="${ROUTES.signIn}"`);
    expect(markup).toContain(en.auth.signInCta);
  });
});

describe('the expired face', () => {
  const markup = renderToStaticMarkup(<ResetLinkExpired messages={en} takeFocus={false} />);

  it('says the link expired or was used, and leads to asking for another', () => {
    expect(markup).toContain(en.auth.resetLinkExpired);
    expect(markup).toContain(`href="${ROUTES.forgotPassword}"`);
    expect(markup).toContain(en.auth.resetLinkExpiredCta);
  });
});

describe('/reset-password', () => {
  it('draws the form for a well-formed token', async () => {
    const markup = await renderPage({ token: TOKEN });

    expect(markup).toContain(en.auth.newPasswordHeading);
    expect(markup).toContain(en.auth.resetConfirmCta);
    expect(markup).not.toContain(en.auth.resetLinkExpired);
    expect(markup).not.toContain(TOKEN);
  });

  it.each([
    ['no token', {}],
    ['a token that is not 64 hex characters', { token: 'abc123' }],
    ['a repeated token', { token: [TOKEN, TOKEN] }],
    ['an old-format numeric code', { token: '123456' }],
  ])('draws the expired face, and no form, for %s', async (_label, query) => {
    const markup = await renderPage(query);

    expect(markup).toContain(en.auth.resetLinkExpired);
    expect(markup).toContain(`href="${ROUTES.forgotPassword}"`);
    expect(markup).not.toContain(en.auth.resetConfirmCta);
    expect(markup).not.toContain('type="password"');
  });
});
