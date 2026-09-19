import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BagLinesSkeleton } from './BagLinesSkeleton';
import { BagPageSkeleton } from './BagPageSkeleton';

/**
 * NEXT-14 — the bag's loading states are the bag's own shape. The panel and the
 * `/bag` page showed a bare "Loading…" line while the bag was read, and the
 * route's skeleton pulsed under reduced motion (A11Y-10).
 */
describe('the bag skeletons', () => {
  const page = renderToStaticMarkup(<BagPageSkeleton />);

  it('draw the lines and the totals column on the page’s own grid', () => {
    expect(page).toContain(renderToStaticMarkup(<BagLinesSkeleton />));
    expect(page).toContain('lg:grid-cols-[minmax(0,1fr)_22rem]');
  });

  it('pulse only where motion is welcome', () => {
    expect(page).not.toMatch(/(?<!motion-safe:)animate-pulse/);
  });
});
