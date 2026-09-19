/**
 * ERR-09 / NEXT-14 — the address book's own skeleton, in the page's own shape:
 * the trail, the heading and its lead, two address cards with their row of
 * actions, and "Add an address" under them, all in the page's `max-w-2xl` column.
 *
 * Without it this route inherited `/account`'s skeleton — a details block and a
 * wide card — which gave way to a narrow list of cards, the shift PERF-08 bans.
 * `aria-hidden`, because a skeleton describes nothing a screen reader should read.
 */
export default function Loading() {
  return (
    <div className="page-shell py-10" aria-hidden>
      <div className="bg-surface-muted mb-4 h-4 w-40 animate-pulse rounded" />
      <div className="bg-surface-muted mb-2 h-8 w-48 animate-pulse rounded" />
      <div className="mb-6 flex max-w-2xl flex-col gap-1.5">
        <div className="bg-surface-muted h-4 w-full animate-pulse rounded" />
        <div className="bg-surface-muted h-4 w-1/2 animate-pulse rounded" />
      </div>

      <div className="flex max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-4">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="border-border rounded-card flex flex-col gap-3 border p-4">
              <div className="flex flex-col gap-1.5">
                <div className="bg-surface-muted h-5 w-40 animate-pulse rounded" />
                <div className="bg-surface-muted h-4 w-64 animate-pulse rounded" />
                <div className="bg-surface-muted h-4 w-24 animate-pulse rounded" />
                <div className="bg-surface-muted h-4 w-28 animate-pulse rounded" />
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="bg-surface-muted h-10 w-16 animate-pulse rounded" />
                <div className="bg-surface-muted h-10 w-28 animate-pulse rounded" />
                <div className="bg-surface-muted h-10 w-20 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="bg-surface-muted h-10 w-36 animate-pulse rounded" />
      </div>
    </div>
  );
}
