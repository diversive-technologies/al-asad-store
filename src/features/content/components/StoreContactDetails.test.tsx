import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CLIENT } from '@/config/client';
import { en } from '@/i18n/messages/en';
import { ur } from '@/i18n/messages/ur';

import { mailtoHref, telHref, whatsAppChatHref } from '../lib/contact-links';
import { StoreContactDetails } from './StoreContactDetails';

/**
 * The Contact us page's details come from `CLIENT.contact` (D5) — FIXTURE values
 * today — and nowhere else. Asserted against the configuration rather than any
 * literal number, so the test holds when the client's real details arrive.
 */
describe('StoreContactDetails', () => {
  const english = renderToStaticMarkup(<StoreContactDetails locale="en" messages={en} />);
  const urdu = renderToStaticMarkup(<StoreContactDetails locale="ur" messages={ur} />);

  it('links the phone, the WhatsApp chat and the email from the client profile', () => {
    expect(english).toContain(`href="${telHref(CLIENT.contact.phone)}"`);
    expect(english).toContain(`href="${whatsAppChatHref(CLIENT.contact.whatsApp)}"`);
    expect(english).toContain(`href="${mailtoHref(CLIENT.contact.email)}"`);
  });

  it('opens WhatsApp in a new tab safely, and says so to a screen reader', () => {
    expect(english).toMatch(/target="_blank" rel="noopener noreferrer"/);
    expect(english).toContain(en.common.opensInNewTab);
  });

  it.each([
    ['English', () => english, en, 'Monday', 'Saturday'],
    ['Urdu', () => urdu, ur, 'پیر', 'ہفتہ'],
  ] as const)('states the hours as one sentence in %s', (_name, markup, messages, first, last) => {
    expect(markup()).toContain(messages.storeContact.hoursLabel);
    expect(markup()).toContain(first);
    expect(markup()).toContain(last);
  });

  it.each([
    ['English', () => english, CLIENT.contact.address.en],
    ['Urdu', () => urdu, CLIENT.contact.address.ur],
  ] as const)('gives the postal address in %s', (_name, markup, lines) => {
    expect(lines?.length ?? 0).toBeGreaterThan(0);
    expect((lines ?? []).map((line) => markup().includes(line))).not.toContain(false);
  });

  it('is marked up as contact information, under a heading of its own', () => {
    expect(english).toContain('<address');
    expect(english).toContain(
      `<h2 class="text-fg text-xl font-medium">${en.storeContact.heading}</h2>`,
    );
  });
});
