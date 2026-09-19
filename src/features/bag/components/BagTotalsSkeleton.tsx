/**
 * NEXT-14 — the `/bag` page's totals column while the bag is read: the
 * free-delivery line and bar, the code field, the price rows and the checkout
 * button, at the heights `BagTotals` and the button draw them. `aria-hidden`,
 * and `motion-safe` (A11Y-10).
 */
export function BagTotalsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="bg-surface-muted h-3 w-40 rounded motion-safe:animate-pulse" />
      <div className="bg-surface-muted h-1 w-full rounded-full motion-safe:animate-pulse" />
      <div className="bg-surface-muted rounded-card h-10 w-full motion-safe:animate-pulse" />
      <div className="bg-surface-muted h-20 w-full rounded motion-safe:animate-pulse" />
      <div className="bg-surface-muted rounded-card mt-1 h-12 w-full motion-safe:animate-pulse" />
    </div>
  );
}
