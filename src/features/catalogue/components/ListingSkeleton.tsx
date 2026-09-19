import { DEFAULT_PAGE_SIZE } from '../lib/search-options';

/** One placeholder per product a page holds — a stable list, never reordered. */
const TILES = Array.from({ length: DEFAULT_PAGE_SIZE }, (_, index) => `tile-${String(index)}`);

/**
 * NEXT-14 — the skeleton approximates the final layout so replacing it does not
 * shift the page: the listing's own `product-grid` of 4:5 photographs, with the
 * two lines of the card's strip under each, one tile for every product a page
 * holds. It used to draw square tiles in a two- and four-column grid of its own,
 * so the page moved when the results arrived.
 *
 * Shared by the catalogue and search routes rather than duplicated into each
 * (PD-01). It deliberately does NOT reuse the hero's sizing: a listing has no
 * hero, and a skeleton that pretended otherwise is exactly what made the header
 * flash transparent on every navigation.
 *
 * A11Y-10: the pulse is `motion-safe`, so it stands still under reduced motion.
 */
export function ListingSkeleton() {
  return (
    <div className="page-shell py-10" aria-hidden>
      <div className="bg-surface-muted rounded-card mb-4 h-4 w-40 motion-safe:animate-pulse" />
      <div className="bg-surface-muted rounded-card mb-8 h-8 w-56 motion-safe:animate-pulse" />

      <div className="product-grid">
        {TILES.map((tile) => (
          <div key={tile} className="flex flex-col">
            <div className="rounded-card bg-surface-muted aspect-4/5 w-full motion-safe:animate-pulse" />
            <div className="mt-3 flex flex-col gap-1">
              <div className="bg-surface-muted h-5 w-3/4 rounded motion-safe:animate-pulse" />
              <div className="bg-surface-muted h-4 w-1/2 rounded motion-safe:animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
