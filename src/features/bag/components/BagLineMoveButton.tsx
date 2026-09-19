'use client';

import { useSession } from '@/features/auth';
import type { Messages } from '@/i18n/messages/en';
import { Heart } from '@/lib/vendor/icons';

import type { BagLineActions } from '../hooks/use-bag-line-changes';
import type { BagLine } from '../schemas/bag.schema';

export interface BagLineMoveButtonProps {
  line: BagLine;
  messages: Messages;
  isBusy: boolean;
  onMove: BagLineActions['moveToWishlist'];
}

/**
 * §16 `moveToWishlist` — "not now" rather than "not this": the line leaves the bag,
 * its hold is released, and the garment waits in the customer's saved items.
 *
 * Drawn for exactly the lines it can work on, and nothing else:
 *
 * - a SIGNED-IN customer only. Saved items belong to an account (§28.3), and the
 *   heart is hidden from a guest for the same reason, so a guest is not offered a
 *   move into a list they cannot open. This decides what to OFFER; the BFF still
 *   refuses a request without a session (SEC-03).
 * - a line the backend says may move (`movableToWishlist`, DATA-13). Today that is
 *   a line picked off the SHELF: a made-to-measure line is what it is because of
 *   the measurement version it names, and a saved item is a product id and nothing
 *   else, so moving it would bring the customer back to a garment with no size and
 *   no measurements, having silently dropped both. It stays in the bag, and Remove
 *   is still there for it. The interface reads the flag rather than `stitching`,
 *   so the day the backend can keep measurements with a saved item, nothing here
 *   changes.
 *
 * No confirmation, unlike Remove: nothing is lost, because the garment is kept.
 * Busy is `aria-busy` on a button that stays enabled, so it keeps the focus it
 * holds; a second press while one change is in flight is refused by the latch.
 */
export function BagLineMoveButton({ line, messages, isBusy, onMove }: BagLineMoveButtonProps) {
  const { isSignedIn } = useSession();
  if (!isSignedIn || !line.movableToWishlist) return null;

  return (
    <button
      type="button"
      onClick={() => {
        onMove(line);
      }}
      aria-busy={isBusy}
      className="text-fg-muted hover:text-fg focus-visible:ring-brand-500 rounded-card inline-flex min-h-6 items-center gap-1 text-xs focus-visible:ring-2 focus-visible:outline-none aria-busy:opacity-50"
    >
      <Heart className="h-3.5 w-3.5" aria-hidden />
      {messages.bag.moveToSaved}
    </button>
  );
}
