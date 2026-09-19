import type { RefObject } from 'react';

import Link from 'next/link';

import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';

export interface WishlistMoveNoticeProps {
  /** What the last move did, in words; `null` before any. */
  status: string | null;
  /** Takes focus once the card that was pressed has left the grid. */
  focusRef: RefObject<HTMLAnchorElement | null>;
  messages: Messages;
}

/**
 * The line that says a saved product went to the bag, and the way to it.
 *
 * It sits ABOVE the list's own states rather than inside the grid, because the
 * move can empty the list: the grid, the loading line and the empty prompt all
 * come and go, and a live region that went with them would be gone at the moment
 * it had something to say.
 *
 * The region is always in the document and never `display: none`, so the first
 * move is announced as reliably as the next; it has no height while it is empty.
 * `View bag` is a LINK to the bag's own page (A11Y-01), which is also what the
 * header's bag count now counts.
 */
export function WishlistMoveNotice({ status, focusRef, messages }: WishlistMoveNoticeProps) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', status === null ? null : 'mb-4')}
    >
      <p role="status" className="text-fg text-sm">
        {status}
      </p>
      {status === null ? null : (
        <Link
          ref={focusRef}
          href={ROUTES.bag}
          className="text-fg rounded-card focus-visible:ring-brand-500 inline-flex min-h-6 items-center text-sm font-medium underline decoration-1 underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
        >
          {messages.bag.viewBag}
        </Link>
      )}
    </div>
  );
}
