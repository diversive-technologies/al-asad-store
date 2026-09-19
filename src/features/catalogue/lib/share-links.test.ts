import { describe, expect, it } from 'vitest';

import { whatsAppShareUrl } from './share-links';

function textOf(href: string): string | null {
  return new URL(href).searchParams.get('text');
}

describe('the WhatsApp share address', () => {
  it("opens WhatsApp's own click-to-chat page, naming no number", () => {
    const url = new URL(whatsAppShareUrl('hello'));

    expect(url.origin).toBe('https://wa.me');
    expect(url.pathname).toBe('/');
  });

  it.each([
    ['a plain sentence', 'Have a look at Plain Waistcoat Suit'],
    ['a line break before the link', 'Have a look:\nhttps://store.example/catalogue/suit'],
    ['characters that would otherwise end the parameter', 'a & b # c ? d = e + f'],
    ['Urdu', 'الاسد پر سادہ واسکٹ سوٹ دیکھیں'],
  ])('carries %s through as the exact message', (_case, message) => {
    expect(textOf(whatsAppShareUrl(message))).toBe(message);
  });

  it('writes a space as %20, which every reader decodes, rather than +', () => {
    const href = whatsAppShareUrl('two words');

    expect(href).toContain('two%20words');
    expect(href).not.toContain('+');
  });
});
