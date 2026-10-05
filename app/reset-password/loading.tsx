/** ERR-09 / NEXT-14 — the skeleton approximates the final layout's dimensions. */
export default function ResetPasswordLoading() {
  return (
    <div className="p-gutter mx-auto flex max-w-sm flex-col gap-4 py-12" aria-hidden>
      <div className="rounded-card bg-surface-muted h-8 w-56 animate-pulse" />
      <div className="rounded-card bg-surface-muted h-10 w-full animate-pulse" />
      <div className="rounded-card bg-surface-muted h-10 w-full animate-pulse" />
      <div className="rounded-card bg-surface-muted h-10 w-32 animate-pulse" />
    </div>
  );
}
