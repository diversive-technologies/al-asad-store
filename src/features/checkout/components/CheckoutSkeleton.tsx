/** The form's groups as `CheckoutFields` draws them, and how many fields each has. */
const GROUPS = [
  { key: 'contact', fields: ['name', 'mobile', 'email'] },
  { key: 'address', fields: ['line', 'city'] },
  { key: 'delivery', fields: ['first', 'second'] },
  { key: 'payment', fields: ['first', 'second', 'third'] },
];

const ROWS = ['subtotal', 'delivery', 'total'];

export interface CheckoutSkeletonProps {
  /** The wait, in words, for a screen reader (`messages.common.loading`). */
  label: string;
}

/**
 * NEXT-14 — checkout's own shape while its first quote is read: the heading, the
 * form's groups down the reading side and the order summary with its button
 * beside them, on the page's own grid. It replaces a bare "Loading…" line that
 * the whole page then pushed down and across.
 *
 * Used for the route's `loading.tsx` and for the first quote only — a re-quote
 * keeps the form on screen (`checkoutQuoteQuery`). The shape is `aria-hidden`,
 * so the wait is said in words beside it; A11Y-10: `motion-safe`.
 */
export function CheckoutSkeleton({ label }: CheckoutSkeletonProps) {
  return (
    <>
      <p role="status" className="sr-only">
        {label}
      </p>
      <div className="page-shell py-10" aria-hidden>
        <div className="bg-surface-muted h-8 w-36 rounded motion-safe:animate-pulse" />

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col gap-8">
            {GROUPS.map((group) => (
              <div key={group.key} className="flex flex-col gap-3">
                <div className="bg-surface-muted h-6 w-40 rounded motion-safe:animate-pulse" />
                {group.fields.map((field) => (
                  <div
                    key={field}
                    className="bg-surface-muted rounded-card h-10 w-full motion-safe:animate-pulse"
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <div className="bg-surface-muted h-6 w-32 rounded motion-safe:animate-pulse" />
            {ROWS.map((row) => (
              <div
                key={row}
                className="bg-surface-muted h-4 w-full rounded motion-safe:animate-pulse"
              />
            ))}
            <div className="bg-surface-muted rounded-card mt-4 h-12 w-full motion-safe:animate-pulse" />
          </div>
        </div>
      </div>
    </>
  );
}
