import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';
import { ur } from '@/i18n/messages/ur';

import { ProductInfoSections } from './ProductInfoSections';

/**
 * A11Y-09 — the information sections sit under a visually hidden h2, which a
 * screen reader moving by headings hears. It used to borrow the catalogue's own
 * title, so the delivery and returns notes were announced as "Catalogue".
 */

const SECTIONS = [{ id: 'delivery', heading: 'Delivery and returns', body: 'Seven days.' }];

describe('the product information sections', () => {
  it.each([
    ['en', en],
    ['ur', ur],
  ] as const)('are headed as the product’s details in %s', (_locale, messages) => {
    const markup = renderToStaticMarkup(
      <ProductInfoSections sections={SECTIONS} messages={messages} />,
    );

    expect(markup).toContain(`class="sr-only">${messages.product.infoHeading}</h2>`);
    expect(markup).not.toContain(`>${messages.catalogue.title}<`);
  });
});
