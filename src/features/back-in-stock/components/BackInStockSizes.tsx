import { Button } from '@/components/ui/button';
import type { Messages } from '@/i18n/messages/en';
import type { SizeId } from '@/lib/domain/ids';
import { formatTemplate } from '@/lib/utils/format';
import { Bell, Loader2 } from '@/lib/vendor/icons';

import type { SoldOutSize } from '../types';

export interface BackInStockSizesProps {
  sizes: readonly SoldOutSize[];
  /** The line that says what these chips do; it names the group. */
  labelledBy: string;
  /** Whether a press opens the address form (a guest) or sends at once (an account). */
  opensForm: boolean;
  /** The chip whose form is open, when `opensForm`. */
  expandedId: SizeId | null;
  /** The chip a request is in flight for. */
  pendingId: SizeId | null;
  onPress: (size: SoldOutSize) => void;
  words: Messages['backInStock'];
}

/**
 * The sold-out sizes of one selector, as buttons (A11Y-01): pressing one asks to
 * be emailed when that size is back.
 *
 * Each is named in full — "Email me when size M is back" — while showing only a
 * bell and the size, and the visible label is inside the accessible name (WCAG
 * 2.5.3). A chip that opens the address form says whether it is open
 * (`aria-expanded`); a chip that sends at once has nothing to expand and says
 * nothing about it.
 *
 * Busy is `aria-busy` on a button that stays ENABLED: a disabled button drops
 * the keyboard focus it holds, which the bag's quantity buttons were fixed for.
 * The spinner stops turning under reduced motion (A11Y-10). 32px tall, over
 * WCAG 2.2's 24px, and never revealed by hover, so a phone has them too.
 */
export function BackInStockSizes({
  sizes,
  labelledBy,
  opensForm,
  expandedId,
  pendingId,
  onPress,
  words,
}: BackInStockSizesProps) {
  return (
    <div role="group" aria-labelledby={labelledBy} className="flex flex-wrap gap-2">
      {sizes.map((size) => {
        const isPending = pendingId === size.id;

        return (
          <Button
            key={size.id}
            type="button"
            variant="secondary"
            size="sm"
            data-size-id={size.id}
            aria-label={formatTemplate(words.sizeCta, { size: size.label })}
            aria-expanded={opensForm ? expandedId === size.id : undefined}
            aria-busy={isPending}
            onClick={() => {
              onPress(size);
            }}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <Bell aria-hidden className="size-4" />
            )}
            <bdi>{size.label}</bdi>
          </Button>
        );
      })}
    </div>
  );
}
