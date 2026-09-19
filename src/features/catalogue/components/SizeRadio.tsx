import type { Messages } from '@/i18n/messages/en';
import { useMessages } from '@/i18n/use-messages';
import type { SizeId } from '@/lib/domain/ids';
import { cn } from '@/lib/utils/cn';
import { formatTemplate } from '@/lib/utils/format';
import { User } from '@/lib/vendor/icons';

import type { AvailabilityStatus } from '../schemas/availability.schema';
import type { SizeOption } from '../schemas/product-detail.schema';

export interface SizeRadioProps {
  /** The radio group this size belongs to — see `SizeSelectorProps.groupId`. */
  groupId: string;
  size: SizeOption;
  isChecked: boolean;
  /** §28.3 — this is the customer's saved size. */
  isSaved: boolean;
  /** `null` means the overlay could not be read (§30.2). */
  status: AvailabilityStatus | null;
  onSelect: (sizeId: SizeId) => void;
}

function statusLabel(status: AvailabilityStatus | null, messages: Messages): string | null {
  const t = messages.product;

  switch (status) {
    case 'SOLD_OUT':
      return t.sizeSoldOut;
    case 'LOW_STOCK':
      return t.sizeLowStock;
    case null:
      return t.sizeUnknown;
    default:
      // IN_STOCK needs no annotation: it is the unremarkable case.
      return null;
  }
}

/**
 * One size of a `SizeSelector`: a native radio, its label, and — for the
 * customer's saved size — a visible mark under it.
 *
 * The saved size is marked in words and a glyph, never by colour (A11Y-06), and
 * the mark is drawn whether or not the size is chosen: a customer who picks
 * another size can still see which one is theirs. It is always drawn, not
 * revealed on hover, because a phone has no hover. The mark is `aria-hidden`
 * because the label already says it: a screen reader hears "M — your saved size"
 * on the radio itself, which is where the choice is made. That name is ONE
 * message led by the size's label (I18N-06), the one the quick-add tray uses, so
 * the visible label steps aside for it rather than being joined to a fragment.
 *
 * Sold-out sizes are SHOWN as sold out rather than removed, disabled, and say why
 * in words (§28.2, A11Y-06) — a struck-through label is a visual convention a
 * screen reader cannot see.
 */
export function SizeRadio({ groupId, size, isChecked, isSaved, status, onSelect }: SizeRadioProps) {
  const messages = useMessages();
  const isSoldOut = status === 'SOLD_OUT';
  const annotation = statusLabel(status, messages);
  const inputId = `size-${groupId}-${String(size.id)}`;

  return (
    <div className="flex flex-col items-center gap-1">
      <input
        type="radio"
        id={inputId}
        name={`size-${groupId}`}
        value={size.id}
        checked={isChecked}
        disabled={isSoldOut}
        onChange={() => {
          onSelect(size.id);
        }}
        className="peer sr-only"
      />
      <label
        htmlFor={inputId}
        className={cn(
          'rounded-card flex min-w-12 cursor-pointer items-center justify-center px-3 py-2 text-sm',
          'peer-focus-visible:ring-brand-500 peer-focus-visible:ring-2',
          isSoldOut
            ? 'text-fg-muted cursor-not-allowed line-through opacity-60'
            : 'peer-checked:bg-brand-600 peer-checked:text-on-brand bg-surface-muted text-fg hover:bg-surface-strong',
        )}
      >
        {isSaved ? (
          <>
            <bdi aria-hidden>{size.label}</bdi>
            <span className="sr-only">
              {formatTemplate(messages.savedSizes.sizeSavedName, { size: size.label })}
            </span>
          </>
        ) : (
          <bdi>{size.label}</bdi>
        )}
        {/* A11Y-06: the state is in words, not only in the strike-through. */}
        {annotation === null ? null : <span className="sr-only"> — {annotation}</span>}
      </label>
      {isSaved ? (
        <span aria-hidden className="text-fg-muted flex items-center gap-1 text-xs">
          <User className="h-3 w-3" />
          {messages.savedSizes.mark}
        </span>
      ) : null}
    </div>
  );
}
