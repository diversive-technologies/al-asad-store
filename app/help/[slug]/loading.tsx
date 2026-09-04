/** ERR-09 / NEXT-14 — an article-shaped skeleton, not the homepage's. */
export default function Loading() {
  return (
    <div className="page-shell max-w-3xl py-12" aria-hidden>
      <div className="bg-surface-muted rounded-card h-9 w-64 animate-pulse" />
      <div className="bg-surface-muted rounded-card mt-3 h-6 w-full animate-pulse" />
      <div className="mt-8 flex flex-col gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="bg-surface-muted rounded-card h-16 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
