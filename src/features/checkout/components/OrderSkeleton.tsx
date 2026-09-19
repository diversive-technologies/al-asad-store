/** Two line rows stand in for the order's lines — the common case is a garment or two. */
const LINES = ['first', 'second'];

const ROWS = ['subtotal', 'delivery', 'total'];

export interface OrderSkeletonProps {
  /** The wait, in words, for a screen reader (`messages.common.loading`). */
  label: string;
}

/**
 * NEXT-14 — the order page's own shape while the order is read: the mark and the
 * number card centred at the top, the delivery and payment blocks side by side,
 * the lines, the summary and the one button, on `OrderConfirmation`'s column. It
 * replaces a bare "Loading…" line that the page then pushed down and across.
 *
 * Used for the route's `loading.tsx` and for the browser read that follows it
 * (`OrderScreen`). The shape is `aria-hidden`, so the wait is said in words beside
 * it; A11Y-10: `motion-safe`.
 */
export function OrderSkeleton({ label }: OrderSkeletonProps) {
  return (
    <>
      <p role="status" className="sr-only">
        {label}
      </p>
      <div className="page-shell max-w-3xl py-12" aria-hidden>
        <div className="flex flex-col items-center">
          <div className="bg-surface-muted h-24 w-24 rounded-full motion-safe:animate-pulse" />
          <div className="bg-surface-muted mt-8 h-8 w-56 rounded motion-safe:animate-pulse" />
          <div className="bg-surface-muted rounded-card mt-6 h-28 w-full max-w-sm motion-safe:animate-pulse" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="bg-surface-muted rounded-card h-32 motion-safe:animate-pulse" />
          <div className="bg-surface-muted rounded-card h-32 motion-safe:animate-pulse" />
        </div>

        <div className="mt-8 flex flex-col gap-4">
          {LINES.map((line) => (
            <div key={line} className="flex items-center gap-4">
              <div className="bg-surface-muted rounded-card h-20 w-16 shrink-0 motion-safe:animate-pulse" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="bg-surface-muted h-4 w-2/3 rounded motion-safe:animate-pulse" />
                <div className="bg-surface-muted h-3 w-1/3 rounded motion-safe:animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex max-w-sm flex-col gap-3">
          {ROWS.map((row) => (
            <div
              key={row}
              className="bg-surface-muted h-4 w-full rounded motion-safe:animate-pulse"
            />
          ))}
        </div>

        <div className="mt-6 flex justify-center">
          <div className="bg-surface-muted rounded-card h-12 w-48 motion-safe:animate-pulse" />
        </div>
      </div>
    </>
  );
}
