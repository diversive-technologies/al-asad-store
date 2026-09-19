import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { en, type Messages } from '@/i18n/messages/en';
import { ur } from '@/i18n/messages/ur';
import { MessagesProvider } from '@/i18n/use-messages';

import { NO_HANDOFF } from '../lib/handoff';
import { NewsletterForm } from './NewsletterForm';
import { NewsletterSignup } from './NewsletterSignup';

function standIn(messages: Messages): string {
  return renderToStaticMarkup(
    <MessagesProvider value={messages}>
      <NewsletterSignup />
    </MessagesProvider>,
  );
}

function form(messages: Messages): string {
  return renderToStaticMarkup(
    <MessagesProvider value={messages}>
      <NewsletterForm handoff={NO_HANDOFF} />
    </MessagesProvider>,
  );
}

/**
 * PERF-10 — the footer draws a stand-in until the form has been downloaded, and
 * the swap between them is only invisible if the two draw the same thing.
 */
describe('the newsletter stand-in', () => {
  it('draws exactly what the form draws, in English and in Urdu', () => {
    expect(standIn(en)).toBe(form(en));
    expect(standIn(ur)).toBe(form(ur));
  });

  it('is a real, labelled form with a submit button (FORM-05)', () => {
    const markup = standIn(en);

    expect(markup).toContain('<label for="newsletter-email" class="sr-only">');
    expect(markup).toContain('id="newsletter-email"');
    expect(markup).toContain('name="email"');
    expect(markup).toContain('type="submit"');
    expect(markup).toContain(en.newsletter.subscribeCta);
  });

  it('says nothing is wrong before anything has been sent', () => {
    const markup = standIn(en);

    expect(markup).toContain('aria-invalid="false"');
    expect(markup).not.toContain('role="alert"');
    expect(markup).not.toContain('aria-busy="true"');
  });
});
