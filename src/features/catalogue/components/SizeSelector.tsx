'use client';

import type { ReactNode } from 'react';

import type { SizeId } from '@/lib/domain/ids';
import { cn } from '@/lib/utils/cn';

import type { AvailabilityStatus } from '../schemas/availability.schema';
import type { SizeOption } from '../schemas/product-detail.schema';
import { SizeRadio } from './SizeRadio';

/** Which of a selector's sizes is chosen, and which is the customer's own. */
export interface SizeChoice {
  selected: SizeId | null;
  /** §28.3 — the customer's saved size, when it is one of this selector's sizes. */
  saved: SizeId | null;
}

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
  /** Grouped because they are one fact about the sizes (CMP-06). */
  choice: SizeChoice;
  onSelect: (sizeId: SizeId) => void;
  /** `null` from the caller means the overlay could not be read (§30.2). */
  statusOf: (sizeId: SizeId) => AvailabilityStatus | null;
  /**
   * A control that belongs on the legend's line — §28.2's size guide. Absent or
   * `null` draws the legend alone on its line.
   */
  legendAction?: ReactNode;
}

/**
 * One size set, as a radio group.
 *
 * A11Y-01: radios rather than buttons, because this is a single choice among
 * several and native radios give arrow-key movement, roving focus and the right
 * announcement for free. A row of `<button>`s would need all three hand-rolled
 * and would still announce wrongly. Each size is a `SizeRadio`, which also marks
 * the customer's saved size (§28.3).
 *
 * §28.2: sold-out sizes are SHOWN as sold out rather than removed. Hiding them
 * would leave a customer wondering whether their size exists at all.
 *
 * Notify Me on those sizes is drawn beside this selector rather than inside it
 * (`SizeGroup`): a sold-out size still cannot be CHOSEN, so asking about one is
 * its own control and leaves this group's radios meaning what they meant.
 *
 * The legend and its action share a line by FLOATING, not by a flex row. Only a
 * `<legend>` that is the fieldset's own child names the group, and a legend inside
 * a wrapper div would not be; a floated legend is still that child — it still names
 * the group — but lays out as ordinary content, so the action can sit at the end of
 * its line and wrap under it when a long piece name or Urdu needs the room. Both
 * floats are logical (`float-start` / `float-end`, I18N-04), and the sizes clear
 * them.
 */
export function SizeSelector({
  legend,
  groupId,
  sizes,
  choice,
  onSelect,
  statusOf,
  legendAction,
}: SizeSelectorProps) {
  if (sizes.length === 0) return null;

  const hasAction = legendAction !== null && legendAction !== undefined;

  return (
    <fieldset>
      {/* FORM-05: the group is labelled, not just the individual inputs. */}
      <legend className={cn('text-fg float-start text-sm font-medium', hasAction && 'leading-8')}>
        {legend}
      </legend>
      {hasAction ? <div className="float-end flex">{legendAction}</div> : null}

      <div className="clear-both flex flex-wrap gap-2 pt-2">
        {sizes.map((size) => (
          <SizeRadio
            key={size.id}
            groupId={groupId}
            size={size}
            isChecked={choice.selected === size.id}
            isSaved={choice.saved === size.id}
            status={statusOf(size.id)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </fieldset>
  );
}
