/**
 * ERR-09 / NEXT-14 — the saved items' own skeleton, in the page's own shape: the
 * trail, the heading, the count line and the same `product-grid` the saved cards
 * are laid out in, with tiles in the cards' 4:5 crop.
 *
 * Without it this route fell back to the homepage's skeleton — a screen-tall hero
 * placeholder replaced by a grid under a heading, which is the shift PERF-08 bans.
 */
export default function Loading() {
  return (
    <div className="page-shell py-10" aria-hidden>
      <div className="bg-surface-muted rounded-card mb-4 h-4 w-40 animate-pulse" />
      <div className="bg-surface-muted rounded-card mb-6 h-8 w-48 animate-pulse" />
      <div className="bg-surface-muted rounded-card mb-4 h-4 w-28 animate-pulse" />

      <div className="product-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="bg-surface-muted rounded-card aspect-[4/5] animate-pulse" />
        ))}
      </div>
    </div>
  );
}
