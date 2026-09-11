'use client';

import type { UseFormRegisterReturn } from 'react-hook-form';

import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

/** How long after a press the focus it causes still counts as the press's own. */
const PRESS_WINDOW_MS = 1000;

/*
 * When a pointer last went down ANYWHERE, in `performance.now()` time.
 *
 * A native listener, registered as this module loads, rather than the input's own
 * `onPointerDown`: the studio hydrates on its first real event, and on a page
 * fresh from the server that first press never reached React's handler — so the
 * focus it caused read as keyboard focus, activated at once, and the ghost click
 * came back on exactly the tap a customer makes first. `performance.now()` and
 * not `event.timeStamp`, which a pointer event and a focus event need not share.
 * A press cancelled into a scroll clears it; the focus it causes spends it.
 */
let pressedAt: number | null = null;

if (typeof window !== 'undefined') {
  const options = { capture: true, passive: true } as const;
  window.addEventListener(
    'pointerdown',
    () => {
      pressedAt = performance.now();
    },
    options,
  );
  window.addEventListener(
    'pointercancel',
    () => {
      pressedAt = null;
    },
    options,
  );
}

/** Whether a focus happening now came from a press, which then waits for its click. */
function spendPress(): boolean {
  const fromPress = pressedAt !== null && performance.now() - pressedAt < PRESS_WINDOW_MS;
  pressedAt = null;
  return fromPress;
}

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
  /*
   * A POINTER activates on its click, not on focus. On a phone, activating turns
   * the studio into focus mode, and focus lands between the press and the release
   * — so the layout changed under the finger and the release came down on whatever
   * was there now: a tap on Chest arrived as a tap on the drawing's Shoulder mark,
   * and could as easily have hit Done. Keyboard focus has no click to wait for,
   * so it still activates at once; `spendPress` tells the two apart.
   */
  return (
    <div
      id={`${id}-field`}
      /* Focusable from script only, so leaving focus mode can hand focus back to
         this ROW: its input would reopen the keyboard, and focus mode with it. */
      tabIndex={-1}
      data-active={isActive ? '' : undefined}
      className={cn(
        'mm-field',
        /* The negative margin lets the band bleed into the gutter while the
           padding puts the text back, so the label still lines up with the
           section headings above it and nothing shifts as the state changes. */
        'rounded-card -mx-3 px-3 py-2 transition-colors duration-200 motion-reduce:transition-none',
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
              onFocus={() => {
                if (!spendPress()) onActivate();
              }}
              onClick={() => {
                onActivate();
              }}
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
