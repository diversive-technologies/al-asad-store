export interface StatusRowProps {
  label: string;
  value: string;
}

/**
 * CMP-01 — declared at module scope as a sibling, not inside its parent.
 * I18N-04 — `border-b` is a block-axis border and does not mirror; the row's
 * inline alignment is handled by the flex container in the parent.
 *
 * The value is wrapped in `<bdi>`, which is `unicode-bidi: isolate` plus
 * `dir="auto"`. Without it the bidi algorithm reorders a neutral-direction
 * string inside an Urdu paragraph: a version of `0.1.0-mock` renders as
 * `mock-0.1.0`, and an order number or tracking reference would be displayed
 * back to the customer in the wrong order. Verified in the browser under
 * `dir="rtl"` (I18N-12).
 */
export function StatusRow({ label, value }: StatusRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="text-sm font-medium text-fg">
        <bdi>{value}</bdi>
      </dd>
    </div>
  );
}
