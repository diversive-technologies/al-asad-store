import { BagLinesSkeleton } from './BagLinesSkeleton';
import { BagTotalsSkeleton } from './BagTotalsSkeleton';

/**
 * NEXT-14 / PERF-08 — the `/bag` page's own shape while it loads: the heading,
 * two lines with their thumbnails, and the totals column beside them — built
 * from the same pieces the page draws while the bag itself is read, so the route
 * and the read cannot show two different shapes.
 *
 * Without it the segment fell back to the homepage's loading state — a
 * screen-tall hero placeholder that the narrow bag page then replaced, which is
 * exactly the shift those rules forbid. `aria-hidden`, because a skeleton
 * describes nothing a screen reader should read out. A11Y-10: `motion-safe`.
 */
export function BagPageSkeleton() {
  return (
    <div className="page-shell py-10" aria-hidden>
      <div className="bg-surface-muted h-8 w-24 rounded motion-safe:animate-pulse" />

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <BagLinesSkeleton />
        <BagTotalsSkeleton />
      </div>
    </div>
  );
}
