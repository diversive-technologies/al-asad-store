/**
 * ERR-09 — every fetching segment has its own loading state.
 *
 * The page's own shape while its reads settle: a heading, the details block, and
 * one card standing in for whatever is on file. `aria-hidden`, because a skeleton
 * describes nothing a screen reader should read out.
 */
export default function Loading() {
  return (
    <div className="page-shell py-10" aria-hidden>
      <div className="bg-surface-muted mb-4 h-4 w-40 animate-pulse rounded" />
      <div className="bg-surface-muted mb-6 h-8 w-56 animate-pulse rounded" />

      <div className="flex max-w-3xl flex-col gap-3">
        <div className="bg-surface-muted h-5 w-32 animate-pulse rounded" />
        <div className="bg-surface-muted h-4 w-64 animate-pulse rounded" />
        <div className="bg-surface-muted h-4 w-48 animate-pulse rounded" />

        <div className="bg-surface-muted mt-8 h-5 w-40 animate-pulse rounded" />
        <div className="border-border rounded-card mt-2 border p-4">
          <div className="bg-surface-muted h-5 w-44 animate-pulse rounded" />
          <div className="bg-surface-muted mt-2 h-4 w-56 animate-pulse rounded" />
          <div className="bg-surface-muted mt-4 h-24 w-full animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}
