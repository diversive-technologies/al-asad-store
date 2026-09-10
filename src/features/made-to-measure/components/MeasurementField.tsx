'use client';

import type { UseFormRegisterReturn } from 'react-hook-form';

import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

export interface MeasurementFieldProps {
  readonly id: string;
  readonly label: string;
  /** Where the tape goes, in words. §34.6: the figure is an enhancement, and a
   *  customer who cannot see it must still be able to complete the form. */
  readonly instruction: string;
  readonly unitSuffix: string;
  readonly error: string | undefined;
  readonly isActive: boolean;
  readonly registration: UseFormRegisterReturn;
  readonly onActivate: () => void;
}

export function MeasurementField({
  id,
  label,
  instruction,
  unitSuffix,
  error,
  isActive,
  registration,
  onActivate,
}: MeasurementFieldProps) {
  return (
    <div
      className={cn(
        /* The negative margin lets the band bleed into the gutter while the
           padding puts the text back, so the label still lines up with the
           section headings above it and nothing shifts as the state changes. */
        '-mx-3 rounded-card px-3 py-2 transition-colors duration-200 motion-reduce:transition-none',
        /*
         * The other half of the sync: the field says which measurement the
         * figure is showing, so the two never disagree about where you are.
         *
         * A tint and nothing else. An accent border down one edge was a THIRD
         * marker for one state, on top of this and the input's own focus ring —
         * and the input is always focused when a field is active, because
         * clicking the figure calls `setFocus`. Tint mixed from the brand token
         * rather than the 50 step: `brand-50` is a near-white jade, so at any
         * useful opacity it reads as a hot bar over a dark surface while staying
         * invisible over a light one.
         */
        isActive ? 'bg-brand-500/10' : 'bg-transparent',
      )}
    >
      <Field id={id} label={label} hint={instruction} error={error}>
        {(aria) => (
          <div className="relative">
            <Input
              {...aria}
              {...registration}
              onFocus={onActivate}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              className="pe-14"
            />
            <span
              aria-hidden="true"
              className="text-fg-muted pointer-events-none absolute inset-y-0 end-3 grid place-items-center text-xs"
            >
              {unitSuffix}
            </span>
          </div>
        )}
      </Field>
    </div>
  );
}
