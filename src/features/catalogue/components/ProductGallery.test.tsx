import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { en, type Messages } from '@/i18n/messages/en';
import { ur } from '@/i18n/messages/ur';
import { MessagesProvider } from '@/i18n/use-messages';

import { productMediaSchema } from '../schemas/product-detail.schema';
import { GalleryFullscreen } from './GalleryFullscreen';
import { ProductGallery } from './ProductGallery';

const FRAMES = productMediaSchema.array().parse([
  { url: '/products/kameez-charcoal.avif', alt: 'Charcoal kameez shalwar' },
  { url: '/products/kameez-charcoal-2.avif', alt: '' },
  { url: '/products/kameez-charcoal-3.avif', alt: '' },
]);

function render(media = FRAMES, messages: Messages = en): string {
  return renderToStaticMarkup(
    <MessagesProvider value={messages}>
      <ProductGallery
        media={media}
        productName="Charcoal Kameez Shalwar"
        locale={messages === ur ? 'ur' : 'en'}
        messages={messages}
      />
    </MessagesProvider>,
  );
}

/**
 * The full-screen view, closed, as the gallery draws it once it has been asked
 * for. The gallery itself no longer draws it on the server: it is fetched and
 * mounted on the first open (PERF-10), so the view is rendered here directly.
 */
function dialogOf(media = FRAMES, messages: Messages = en): string {
  return renderToStaticMarkup(
    <MessagesProvider value={messages}>
      <GalleryFullscreen
        isOpen={false}
        onClose={() => undefined}
        media={media}
        activeIndex={0}
        onSelect={() => undefined}
        productName="Charcoal Kameez Shalwar"
        locale={messages === ur ? 'ur' : 'en'}
      />
    </MessagesProvider>,
  );
}

function count(markup: string, pattern: RegExp): number {
  return markup.match(pattern)?.length ?? 0;
}

/** §28.2 — "gallery with thumbnails, desktop magnifier, mobile tap-to-fullscreen". */
describe('the product gallery', () => {
  it('makes the main photograph one button that opens the full-screen view', () => {
    const markup = render();

    expect(markup).toContain('aria-label="Open image 1 of 3 full screen"');
    // The overlay sits beside the image, so the image keeps its own alt text.
    expect(markup).toContain('alt="Charcoal kameez shalwar"');
  });

  it('asks for twice the drawn width only where the pointer can magnify', () => {
    const sizes = /sizes="([^"]+)"/.exec(render())?.[1] ?? '';

    expect(sizes).toBe(
      '(hover: hover) and (pointer: fine) and (min-width: 1024px) 100vw, (hover: hover) and (pointer: fine) 200vw, (min-width: 1024px) 50vw, 100vw',
    );
  });

  it('keeps the thumbnail strip on the page', () => {
    expect(count(render(), /aria-label="View image \d"/g)).toBe(3);
  });

  it('does not put the full-screen view in the page until it is first opened', () => {
    expect(render()).not.toContain('<dialog');
  });

  it('renders the full-screen view closed, named, with every frame in it', () => {
    const dialog = dialogOf();

    expect(dialog).toMatch(
      /^<dialog aria-label="Photographs of Charcoal Kameez Shalwar" class="fullscreen-dialog">/,
    );
    expect(dialog).not.toMatch(/^<dialog[^>]* open/);
    expect(count(dialog, /<img /g)).toBe(6); // three frames and three thumbnails
    expect(count(dialog, /aria-hidden="true"[^>]*sizes="100vw"/g)).toBe(2);
  });

  it('announces the position politely and offers both ways to step', () => {
    const dialog = dialogOf();

    expect(dialog).toContain(
      '<p role="status" class="text-fg-muted text-center text-sm">Image 1 of 3</p>',
    );
    expect(dialog).toContain('aria-label="Previous image"');
    expect(dialog).toContain('aria-label="Next image"');
    expect(dialog).toContain('aria-label="Close the full-screen view"');
  });

  it('never takes pinch-zoom away (§30.3)', () => {
    expect(render()).not.toMatch(/touch-action|user-scalable/);
    expect(dialogOf()).not.toMatch(/touch-action|user-scalable/);
  });

  it('draws no strip, no arrows and no position for a single photograph, but still opens', () => {
    const single = FRAMES.slice(0, 1);
    const markup = render(single);
    const dialog = dialogOf(single);

    expect(markup).toContain('aria-label="Open image 1 of 1 full screen"');
    expect(markup).not.toContain('View image');
    expect(dialog).not.toContain('Next image');
    expect(dialog).not.toContain('role="status"');
  });

  it('speaks Urdu, with the position in the language’s own order', () => {
    const markup = render(FRAMES, ur);
    const dialog = dialogOf(FRAMES, ur);

    expect(markup).toContain('aria-label="3 میں سے تصویر 1 پوری اسکرین پر دیکھیں"');
    expect(dialog).toContain('>3 میں سے تصویر 1</p>');
    expect(dialog).toContain('aria-label="Charcoal Kameez Shalwar کی تصاویر"');
  });
});
