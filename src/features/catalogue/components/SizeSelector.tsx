'use client';

import type { SizeId } from '@/lib/domain/ids';
import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';

import type { AvailabilityStatus } from '../schemas/availability.schema';
import type { SizeOption } from '../schemas/product-detail.schema';

export interface SizeSelectorProps {
  legend: string;
  /**
   * Identifies this GROUP of radios, which is not the same thing as the piece.
   * A SET draws the unified selector and the first piece's own override from the
   * same size list, and giving both the piece's id put them in one radio group
   * with duplicate input ids — choosing a unified size silently unchecked the
   * piece's own control, and every `htmlFor` pointed at two elements.
   */
  groupId: string;
  sizes: readonly SizeOption[];
  selected: SizeId | null;
  onSelect: (sizeId: SizeId) => void;
  /** `null` from the caller means the overlay could not be read (§30.2). */
  statusOf: (sizeId: SizeId) => AvailabilityStatus | null;
  messages: Messages;
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
 * One size set, as a radio group.
 *
 * A11Y-01: radios rather than buttons, because this is a single choice among
 * several and native radios give arrow-key movement, roving focus and the right
 * announcement for free. A row of `<button>`s would need all three hand-rolled
 * and would still announce wrongly.
 *
 * §28.2: sold-out sizes are SHOWN as sold out rather than removed. Hiding them
 * would leave a customer wondering whether their size exists at all. They stay
 * in the list, disabled, and say why in words — A11Y-06, since a struck-through
 * label is a visual convention a screen reader cannot see.
 *
 * Notify Me on those sizes is the next slice; the state it hangs from is here.
 */
export function SizeSelector({
  legend,
  groupId,
  sizes,
  selected,
  onSelect,
  statusOf,
  messages,
}: SizeSelectorProps) {
  if (sizes.length === 0) return null;

  return (
    <fieldset>
      {/* FORM-05: the group is labelled, not just the individual inputs. */}
      <legend className="text-fg mb-2 text-sm font-medium">{legend}</legend>

      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const status = statusOf(size.id);
          const isSoldOut = status === 'SOLD_OUT';
          const annotation = statusLabel(status, messages);
          const inputId = `size-${groupId}-${String(size.id)}`;

          return (
            <div key={size.id}>
              <input
                type="radio"
                id={inputId}
                name={`size-${groupId}`}
                value={size.id}
                checked={selected === size.id}
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
                <bdi>{size.label}</bdi>
                {/* A11Y-06: the state is in words, not only in the strike-through. */}
                {annotation === null ? null : <span className="sr-only"> — {annotation}</span>}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
