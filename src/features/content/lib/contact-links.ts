import { WHATSAPP_SHARE_URL } from '@/config/constants';

/**
 * The addresses behind the store's contact details, from numbers written the way
 * people read them (`+92 300 0000000`). Pure, so the rules for what a dialler and
 * WhatsApp accept are tested once rather than trusted in markup.
 */

/** `tel:` wants the digits and the leading `+`, with no spaces or dashes. */
export function telHref(number: string): string {
  return `tel:${number.replace(/[^\d+]/g, '')}`;
}

/**
 * WhatsApp's "click to chat" with the store: its own address followed by the
 * number in international form as digits alone — no `+`, no spaces.
 */
export function whatsAppChatHref(number: string): string {
  return `${WHATSAPP_SHARE_URL}${number.replace(/\D/g, '')}`;
}

export function mailtoHref(email: string): string {
  return `mailto:${email}`;
}
