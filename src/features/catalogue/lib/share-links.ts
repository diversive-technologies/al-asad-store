import { WHATSAPP_SHARE_URL } from '@/config/constants';

/**
 * §28.2's WhatsApp sharing: the address that opens WhatsApp with `message`
 * already written, for the customer to send to whoever they choose.
 *
 * `encodeURIComponent` rather than `URLSearchParams`, and the difference is the
 * message rather than the URL: `URLSearchParams` writes a space as `+`, which is
 * only a space to a reader that decodes form encoding, while `%20` is a space to
 * every reader. The message carries the product's own address, so its `&`, `#`
 * and `?` have to survive as text rather than end the parameter.
 */
export function whatsAppShareUrl(message: string): string {
  return `${WHATSAPP_SHARE_URL}?text=${encodeURIComponent(message)}`;
}
