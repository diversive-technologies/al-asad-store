/**
 * ERR-09 — a fetching segment declares its own loading state. A11Y-10: the pulse
 * is `motion-safe`, so it stands still under reduced motion.
 */
export default function ProductLoading() {
  return (
    <div className="page-shell py-10" aria-hidden>
      <div className="product-layout">
        <div className="rounded-card bg-surface-muted aspect-4/5 w-full motion-safe:animate-pulse" />
        <div className="flex flex-col gap-4">
          <div className="bg-surface-muted h-8 w-2/3 rounded motion-safe:animate-pulse" />
          <div className="bg-surface-muted h-4 w-full rounded motion-safe:animate-pulse" />
          <div className="bg-surface-muted h-4 w-1/2 rounded motion-safe:animate-pulse" />
          <div className="bg-surface-muted mt-6 h-12 w-full rounded motion-safe:animate-pulse" />
        </div>
      </div>
    </div>
  );
}
