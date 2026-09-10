'use client';

import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';

import { GARMENTS, type GarmentId } from '../lib/garments';

/**
 * Which garment is on the table.
 *
 * Radios rather than buttons (A11Y-11): these are three mutually exclusive
 * choices with one in force, which is what a radio group means. The input itself
 * is `sr-only`, so the focus ring is borrowed onto the label that is visible.
 */
export function GarmentTabs({
  current,
  onChoose,
  messages,
}: {
  readonly current: GarmentId;
  readonly onChoose: (garment: GarmentId) => void;
  readonly messages: Messages;
}) {
  const t = messages.madeToMeasure;

  return (
    <fieldset className="mm-tabs">
      <legend className="sr-only">{t.garmentLabel}</legend>
      {GARMENTS.map((id) => (
        <label key={id} className={cn('mm-tab', id === current && 'mm-tab--on')}>
          <input
            type="radio"
            name="garment"
            value={id}
            checked={id === current}
            onChange={() => {
              onChoose(id);
            }}
            className="sr-only"
          />
          {t.garments[id]}
        </label>
      ))}
    </fieldset>
  );
}
