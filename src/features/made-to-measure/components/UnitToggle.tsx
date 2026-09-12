'use client';

import type { Messages } from '@/i18n/messages/en';

import { UNITS, type Unit } from '../lib/units';
import { SegmentedChoice } from './SegmentedChoice';

export interface UnitToggleProps {
  readonly unit: Unit;
  readonly onChange: (next: Unit) => void;
  readonly messages: Messages;
}

/**
 * Inches or centimetres.
 *
 * ADR 16 makes this purely a display choice — the record is millimetres either
 * way — so the toggle converts every field that is already filled rather than
 * clearing them.
 */
export function UnitToggle({ unit, onChange, messages }: UnitToggleProps) {
  const t = messages.madeToMeasure;
  const label: Readonly<Record<Unit, string>> = { IN: t.unitInches, CM: t.unitCentimetres };

  return (
    <SegmentedChoice
      legend={t.unitLabel}
      name="measurement-unit"
      options={UNITS.map((option) => ({ value: option, label: label[option] }))}
      value={unit}
      onChange={onChange}
    />
  );
}
