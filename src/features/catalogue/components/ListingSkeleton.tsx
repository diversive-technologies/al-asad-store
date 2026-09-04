/**
 * NEXT-14 — the skeleton approximates the final layout so replacing it does not
 * shift the page.
 *
 * Shared by the catalogue and search routes rather than duplicated into each
 * (PD-01). It deliberately does NOT reuse the hero's sizing: a listing has no
 * hero, and a skeleton that pretended otherwise is exactly what made the header
 * flash transparent on every navigation.
 */
export function ListingSkeleton() {
  return (
    <div className="page-shell py-10" aria-hidden>
      <div className="bg-surface-muted rounded-card mb-4 h-4 w-40 animate-pulse" />
      <div className="bg-surface-muted rounded-card mb-8 h-8 w-56 animate-pulse" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="bg-surface-muted rounded-card aspect-square animate-pulse" />
        ))}
      </div>
    </div>
  );
}
