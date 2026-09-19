import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DEFAULT_PAGE_SIZE } from '../lib/search-options';
import { ListingSkeleton } from './ListingSkeleton';

/**
 * The listing's loading state: the shape the results arrive in (NEXT-14), and
 * still under reduced motion (A11Y-10). It used to pulse regardless, in square
 * tiles on a grid of its own, so the page moved when the results landed.
 */
describe('the listing skeleton', () => {
  const markup = renderToStaticMarkup(<ListingSkeleton />);

  it('pulses only where motion is welcome', () => {
    expect(markup).not.toMatch(/(?<!motion-safe:)animate-pulse/);
  });

  it('draws the listing’s own grid of 4:5 tiles, one per product a page holds', () => {
    expect(markup).toContain('class="product-grid"');
    expect(markup.match(/aspect-4\/5/g)).toHaveLength(DEFAULT_PAGE_SIZE);
    expect(markup).not.toContain('aspect-square');
  });
});
