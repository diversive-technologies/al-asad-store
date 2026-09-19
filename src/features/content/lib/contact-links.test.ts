import { describe, expect, it } from 'vitest';

import { CLIENT } from '@/config/client';

import { mailtoHref, telHref, whatsAppChatHref } from './contact-links';

describe('the contact links', () => {
  it('dials a number written for people, keeping the country code', () => {
    expect(telHref('+92 300-123 4567')).toBe('tel:+923001234567');
  });

  it("opens a WhatsApp chat on the number's digits alone", () => {
    expect(whatsAppChatHref('+92 300-123 4567')).toBe('https://wa.me/923001234567');
  });

  it('writes an email address as a mailto link', () => {
    expect(mailtoHref('someone@example.com')).toBe('mailto:someone@example.com');
  });

  it('turns the configured numbers into addresses a phone can use', () => {
    expect(telHref(CLIENT.contact.phone)).toMatch(/^tel:\+\d{8,15}$/);
    expect(whatsAppChatHref(CLIENT.contact.whatsApp)).toMatch(/^https:\/\/wa\.me\/\d{8,15}$/);
  });
});
