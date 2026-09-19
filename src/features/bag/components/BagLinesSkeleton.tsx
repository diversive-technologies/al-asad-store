/** Two lines is enough to read as a bag without claiming how many it holds. */
const LINES = ['first', 'second'];

/**
 * NEXT-14 — a bag line's own shape while the bag is read: the thumbnail, the
 * name, the per-piece sizes and the quantity control, as `BagLineRow` draws them.
 * Shared by the panel, the `/bag` page and its route skeleton, so the three
 * cannot drift (PD-01).
 *
 * `aria-hidden`: a skeleton describes nothing a screen reader should read out,
 * so whoever draws it says "Loading" in words beside it. A11Y-10: the pulse is
 * `motion-safe`.
 */
export function BagLinesSkeleton() {
  return (
    <ul aria-hidden>
      {LINES.map((key) => (
        <li key={key} className="border-border flex gap-3 border-b py-4 last:border-b-0">
          <div className="bg-surface-muted rounded-card size-20 shrink-0 motion-safe:animate-pulse" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="bg-surface-muted h-4 w-2/3 rounded motion-safe:animate-pulse" />
            <div className="bg-surface-muted h-3 w-1/3 rounded motion-safe:animate-pulse" />
            <div className="bg-surface-muted mt-2 h-7 w-28 rounded-full motion-safe:animate-pulse" />
          </div>
        </li>
      ))}
    </ul>
  );
}
