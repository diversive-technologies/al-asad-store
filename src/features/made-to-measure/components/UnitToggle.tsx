'use client';

import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';

import { UNITS, type Unit } from '../lib/units';

/**
 * Inches or centimetres.
 *
 * ADR 16 makes this purely a display choice — the record is millimetres either
 * way — so the toggle converts every field that is already filled rather than
 * clearing them.
 */
export function UnitToggle({
  unit,
  onChange,
  messages,
}: {
  readonly unit: Unit;
  readonly onChange: (next: Unit) => void;
  readonly messages: Messages;
}) {
  const t = messages.madeToMeasure;
  const label: Readonly<Record<Unit, string>> = { IN: t.unitInches, CM: t.unitCentimetres };

  return (
    <fieldset>
      <legend className="text-fg-muted mb-1.5 text-xs">{t.unitLabel}</legend>
      <div className="border-border rounded-pill inline-flex border p-0.5">
        {UNITS.map((option) => (
          <label
            key={option}
            className={cn(
              'rounded-pill cursor-pointer px-3 py-1 text-xs transition-colors duration-200',
              'has-[:focus-visible]:ring-accent-400 has-[:focus-visible]:ring-2',
              'motion-reduce:transition-none',
              option === unit ? 'mm-unit-on' : 'text-fg-muted hover:text-fg',
            )}
          >
            <input
              type="radio"
              name="measurement-unit"
              value={option}
              checked={option === unit}
              onChange={() => {
                onChange(option);
              }}
              className="sr-only"
            />
            {label[option]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
