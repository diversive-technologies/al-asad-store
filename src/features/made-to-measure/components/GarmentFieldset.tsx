'use client';

import type { UseFormReturn } from 'react-hook-form';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatNumber, formatTemplate } from '@/lib/utils/format';

import {
  enteredFromStored,
  measurementsFor,
  type GarmentId,
  type MeasurementId,
} from '../lib/garments';
import { fromMm, type Unit } from '../lib/units';
import type { MeasurementEntry } from '../schemas/measurement.schema';
import { MeasurementField } from './MeasurementField';

/**
 * One garment's measurements, grouped under its own legend.
 *
 * The grouping is not decoration: thirteen fields in one list gives no clue
 * which garment to fetch off the shelf next, and a `<fieldset>` is what tells a
 * screen reader the same thing the heading tells everyone else (A11Y-11).
 */
export function GarmentFieldset({
  garment,
  form,
  unit,
  unitSuffix,
  activeId,
  onActivate,
  messages,
  locale,
}: {
  readonly garment: GarmentId;
  readonly form: UseFormReturn<MeasurementEntry>;
  readonly unit: Unit;
  readonly unitSuffix: string;
  readonly activeId: MeasurementId | null;
  readonly onActivate: (id: MeasurementId) => void;
  readonly messages: Messages;
  readonly locale: Locale;
}) {
  const t = messages.madeToMeasure;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-fg-muted border-border mb-3 w-full border-b pb-2 text-xs tracking-[0.18em] uppercase">
        {t.garments[garment]}
      </legend>

      {measurementsFor(garment).map((measurement) => (
        <MeasurementField
          key={measurement.id}
          id={measurement.id}
          label={t.points[measurement.id].label}
          instruction={t.points[measurement.id].instruction}
          unitSuffix={unitSuffix}
          /* The bounds shown are the ENTERED figure, so a ring's stored
             circumference is halved back before it reaches the customer. */
          error={
            form.formState.errors[measurement.id] === undefined
              ? undefined
              : formatTemplate(t.outOfRange, {
                  min: formatNumber(
                    fromMm(enteredFromStored(measurement, measurement.minMm), unit),
                    locale,
                  ),
                  max: formatNumber(
                    fromMm(enteredFromStored(measurement, measurement.maxMm), unit),
                    locale,
                  ),
                })
          }
          isActive={measurement.id === activeId}
          registration={form.register(measurement.id)}
          onActivate={() => {
            onActivate(measurement.id);
          }}
        />
      ))}
    </fieldset>
  );
}
