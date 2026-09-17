import { describe, expect, it } from 'vitest';

import { ROUTES } from './routes';

describe('the studio address', () => {
  it('is bare when nothing is asked for', () => {
    expect(ROUTES.stitchedWith({ style: null, source: null, product: null })).toBe('/stitched');
  });

  it('carries the product beside the style, so the studio can name it and send the customer back', () => {
    expect(
      ROUTES.stitchedWith({ style: 'WAISTCOAT_SUIT', source: null, product: 'plain-suit-1' }),
    ).toBe('/stitched?style=WAISTCOAT_SUIT&product=plain-suit-1');
  });

  it('escapes a slug, which unlike a style code is not guaranteed to be plain', () => {
    const href = ROUTES.stitchedWith({ style: null, source: 'TAILOR_CARD', product: 'a&b c' });
    expect(new URL(href, 'https://example.test').searchParams.get('product')).toBe('a&b c');
  });
});
