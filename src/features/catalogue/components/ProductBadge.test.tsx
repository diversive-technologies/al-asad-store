import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';

import { ProductBadge } from './ProductBadge';

/**
 * A11Y-07 in both themes (STY-09). The Sale badge sits on the gold accent, which
 * the dark theme does not redefine — so its ink must be the one token made for
 * that ground and fixed with it, `on-accent`, not the theme's own `fg`, which
 * turns near-white in dark mode and measured 2.09:1 there.
 */
describe('the Sale badge', () => {
  const markup = renderToStaticMarkup(<ProductBadge kind="DISCOUNT" messages={en} />);

  it('says what it is in words', () => {
    expect(markup).toContain(`>${en.product.discountBadge}<`);
  });

  it('inks the gold with the colour that does not move with the theme', () => {
    expect(markup).toContain('bg-accent-500 text-on-accent');
    expect(markup).not.toMatch(/\btext-fg\b/);
  });
});
