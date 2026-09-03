/**
 * ERR-09 — every fetching segment has a loading state.
 * NEXT-14 — the skeleton approximates the final layout's dimensions so that
 * replacing it does not shift the page.
 */
export default function HomeLoading() {
  return (
    <div className="mx-auto max-w-2xl p-gutter" aria-hidden>
      <div className="mb-6 h-8 w-1/2 animate-pulse rounded-card bg-surface-muted" />
      <div className="mb-6 h-16 w-full animate-pulse rounded-card bg-surface-muted" />
      <div className="mb-6 h-48 w-full animate-pulse rounded-card bg-surface-muted" />
      <div className="h-10 w-64 animate-pulse rounded-card bg-surface-muted" />
    </div>
  );
}
