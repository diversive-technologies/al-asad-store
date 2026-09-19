import { RELATED_PRODUCTS_LIMIT } from '../schemas/related-products.schema';

/** One placeholder per product the section asks for — a stable list, never reordered. */
const TILES = Array.from({ length: RELATED_PRODUCTS_LIMIT }, (_, index) => `tile-${String(index)}`);

/**
 * NEXT-14 / PERF-08 — the shape "You may also like" arrives in, while it is on its
 * way: the section's spacing, a heading line, and the listing's own
 * `product-grid` of 4:5 photographs with the two lines of the card's strip under
 * each.
 *
 * As many tiles as the section asks for, because a full answer is the common
 * one, and a placeholder the size of a full grid is what lets it arrive without
 * moving the footer. When fewer come back — or none, and the section is not
 * drawn — the page gets shorter below the reader rather than pushing content
 * they are looking at.
 *
 * `aria-hidden`, like every skeleton in the store: it carries nothing to read.
 * A11Y-10: the pulse is `motion-safe`, so it stands still under reduced motion.
 */
export function RelatedProductsSkeleton() {
  return (
    <div className="mt-16" aria-hidden>
      <div className="bg-surface-muted mb-4 h-7 w-48 rounded motion-safe:animate-pulse" />

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
