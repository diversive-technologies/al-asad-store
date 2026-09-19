import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { OrderSkeleton } from './OrderSkeleton';

/**
 * NEXT-14 — the order page's loading state is the order page's own shape. Its
 * route and its browser read both showed a bare "Loading…" line.
 */
describe('the order skeleton', () => {
  const markup = renderToStaticMarkup(<OrderSkeleton label="Loading…" />);

  it('says the wait in words, and hides the shape from assistive tech', () => {
    expect(markup).toContain('<p role="status" class="sr-only">Loading…</p>');
    expect(markup).toContain('aria-hidden="true"');
  });

  it('keeps the confirmation column and a base column count for phones', () => {
    expect(markup).toContain('page-shell max-w-3xl');
    expect(markup).toContain('grid grid-cols-1 gap-6 sm:grid-cols-2');
  });

  it('pulses only where motion is welcome', () => {
    expect(markup).not.toMatch(/(?<!motion-safe:)animate-pulse/);
  });
});
