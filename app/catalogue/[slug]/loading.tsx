/** ERR-09 — a fetching segment declares its own loading state. */
export default function ProductLoading() {
  return (
    <div className="page-shell py-10" aria-hidden>
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="rounded-card bg-surface-muted aspect-[4/5] w-full animate-pulse" />
        <div className="flex flex-col gap-4">
          <div className="bg-surface-muted h-8 w-2/3 animate-pulse rounded" />
          <div className="bg-surface-muted h-4 w-full animate-pulse rounded" />
          <div className="bg-surface-muted h-4 w-1/2 animate-pulse rounded" />
          <div className="bg-surface-muted mt-6 h-12 w-full animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}
