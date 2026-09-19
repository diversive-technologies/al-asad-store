import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { en } from '@/i18n/messages/en';
import { err, ok } from '@/lib/result';

import { staticPageSchema } from '../schemas/page.schema';
import { InlineHelpPage } from './InlineHelpPage';

const sizeGuide = staticPageSchema.parse({
  slug: 'size-guide',
  title: 'Size guide',
  intro: 'Measurements are taken flat.',
  blocks: [
    { kind: 'HEADING', id: 'sets', text: 'Sets' },
    { kind: 'PARAGRAPH', id: 'sets-0', text: 'A set is measured piece by piece.' },
  ],
});

beforeEach(() => {
  // ERR-10 is the component's job; the log line itself is not under test here.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * §28.2 — the size guide shown in a dialog on the product page, from the same
 * content its own address serves.
 */
describe('a help page shown inside another page', () => {
  it("shows the page's body under the dialog's heading, and its own address", () => {
    const markup = renderToStaticMarkup(
      <InlineHelpPage read={{ slug: 'size-guide', result: ok(sizeGuide) }} messages={en} />,
    );

    expect(markup).toContain('Measurements are taken flat.');
    expect(markup).toContain('A set is measured piece by piece.');
    // A11Y-09: a dialog's title is its h2, so the page's own headings start at h3.
    expect(markup).toContain('<h3 class="text-fg text-xl font-medium">Sets</h3>');
    expect(markup).not.toContain('<h2');
    expect(markup).toContain('href="/help/size-guide"');
    expect(markup).toContain(en.help.openFullPage);
  });

  it('says it could not be loaded when the read failed, and offers its address to try again', () => {
    const markup = renderToStaticMarkup(
      <InlineHelpPage
        read={{ slug: 'size-guide', result: err({ kind: 'NETWORK', message: 'down' }) }}
        messages={en}
      />,
    );

    expect(markup).toContain(en.help.unavailable);
    expect(markup).toContain('href="/help/size-guide"');
    expect(console.error).toHaveBeenCalledOnce();
  });

  it('offers no address for a page the content says does not exist', () => {
    const markup = renderToStaticMarkup(
      <InlineHelpPage read={{ slug: 'size-guide', result: ok(null) }} messages={en} />,
    );

    expect(markup).toContain(en.help.unavailable);
    expect(markup).not.toContain('href=');
  });
});
