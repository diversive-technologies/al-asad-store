import { useId } from 'react';

import Link, { useLinkStatus } from 'next/link';

/* Only a descendant of the Link can ask whether its own navigation is under way. */
function PendingLabel({ label }: { readonly label: string }) {
  const { pending } = useLinkStatus();
  return <span data-pending={pending ? '' : undefined}>{label}</span>;
}

export interface ChoiceStripItem {
  readonly key: string;
  readonly href: string;
  readonly label: string;
  readonly isCurrent: boolean;
}

export interface ChoiceStripProps {
  readonly label: string;
  readonly hint: string;
  readonly items: readonly ChoiceStripItem[];
}

/**
 * A choice of LIST, as a strip of links — the style being stitched, or the way
 * it is measured. Each decides which list the backend serves, so choosing one is
 * choosing an address: a bookmark or a shared link opens the same list.
 *
 * The navigation stays on the client and the studio stays mounted, so figures
 * typed survive it. It REPLACES the address, so Back leaves the studio instead of
 * flipping between lists, and keeps the scroll; the pending link dims while the
 * next list is on its way. Drawn as an underlined strip rather than as the garment
 * tabs' pills, because the two do different things.
 */
export function ChoiceStrip({ label, hint, items }: ChoiceStripProps) {
  const labelId = useId();

  return (
    <>
      <p id={labelId} className="text-fg-muted text-xs">
        {label}
      </p>
      <ul role="list" aria-labelledby={labelId} className="mm-style-list">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={item.isCurrent ? 'page' : undefined}
              replace
              scroll={false}
              className="mm-style"
            >
              <PendingLabel label={item.label} />
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-fg-muted text-xs">{hint}</p>
    </>
  );
}
