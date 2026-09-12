import type { OptionGroupId, OptionValueId } from '@/lib/domain/ids';

import type { ChoiceInPlay } from '../lib/options';
import { SegmentedChoice } from './SegmentedChoice';

export interface PieceOptionsProps {
  /** The choices in play on this garment, in the served order. */
  readonly choices: readonly ChoiceInPlay[];
  /** What the choices describe on this path — see `MeasurementFieldsets`. */
  readonly hint: string;
  readonly onChoose: (group: OptionGroupId, value: OptionValueId) => void;
}

/**
 * A garment's finishing choices, above its measurements because on the garment
 * path they decide which are asked — a cuff only with a cuff. A choice that
 * depends on another appears only while it applies: a ban's width only with a
 * ban.
 *
 * `mm-choices` leaves the page in focus mode, so the keyboard cannot reach a
 * choice nobody can see. Rendered inside `MeasurementStudio`'s client boundary.
 */
export function PieceOptions({ choices, hint, onChoose }: PieceOptionsProps) {
  if (choices.length === 0) return null;

  return (
    <div className="mm-choices flex flex-col gap-3 pb-2">
      <p className="text-fg-muted text-xs text-pretty">{hint}</p>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {choices.map(({ group, value }) => (
          <SegmentedChoice
            key={group.id}
            legend={group.label}
            name={`option-${group.id}`}
            options={group.values.map((option) => ({ value: option.id, label: option.label }))}
            value={value.id}
            onChange={(next) => {
              onChoose(group.id, next);
            }}
          />
        ))}
      </div>
    </div>
  );
}
