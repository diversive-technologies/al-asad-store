import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { en } from '@/i18n/messages/en';
import { MessagesProvider } from '@/i18n/use-messages';

import { ProductShare } from './ProductShare';

/* SSOT-03 validates the client environment as it loads, and the canonical address
   is built from it — so the app URL is set before any import is evaluated. */
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://store.example';
});

/* The copy button reads its words from the provider the root layout mounts. */
function render(): string {
  return renderToStaticMarkup(
    <MessagesProvider value={en}>
      <ProductShare slug="plain-waistcoat-suit" productName="Plain Waistcoat Suit" messages={en} />
    </MessagesProvider>,
  );
}

function whatsAppHref(markup: string): URL {
  const href = /href="([^"]+)"/.exec(markup)?.[1] ?? '';
  return new URL(href.replaceAll('&amp;', '&'));
}

/** §28.2 — "WhatsApp and copy-link sharing". */
describe('sharing a product', () => {
  it('opens WhatsApp with the product and its canonical address already written', () => {
    const url = whatsAppHref(render());

    expect(url.origin).toBe('https://wa.me');
    expect(url.searchParams.get('text')).toBe(
      'Have a look at Plain Waistcoat Suit from Al-Asad:\nhttps://store.example/catalogue/plain-waistcoat-suit',
    );
  });

  it('opens WhatsApp away from the store, safely, and says so (SEC-09)', () => {
    const markup = render();

    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain(`<span class="sr-only"> ${en.common.opensInNewTab}</span>`);
  });

  it('has its copy confirmation’s live region in place, empty, before anything is pressed', () => {
    expect(render()).toContain('<p role="status" class="text-fg-muted text-xs"><span></span></p>');
  });
});
