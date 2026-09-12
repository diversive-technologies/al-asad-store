'use client';

import type { MouseEvent } from 'react';

import { Button } from '@/components/ui/button';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatNumber, formatTemplate } from '@/lib/utils/format';
import { ChevronLeft, ChevronRight } from '@/lib/vendor/icons';

import type { FocusMode } from '../hooks/use-focus-mode';
import { stepFrom } from '../lib/measurement-set';

/* Keeps the caret in the field while stepping, so a phone's keyboard stays up
   rather than dropping and springing back for every measurement. */
function keepFocus(event: MouseEvent<HTMLButtonElement>): void {
  event.preventDefault();
}

/**
 * Focus mode's way between measurements, while every other field is out of sight.
 *
 * The stylesheet draws it only in focus mode on the stacked layout, and its being
 * drawn is how `useFocusMode` knows that mode is on.
 */
export function MeasurementStepper({
  focus,
  messages,
  locale,
}: {
  readonly focus: FocusMode;
  readonly messages: Messages;
  readonly locale: Locale;
}) {
  const t = messages.madeToMeasure;
  const { activeId, order } = focus;
  if (activeId === null) return null;

  return (
    <div className="mm-stepper">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 px-2"
        disabled={stepFrom(order, activeId, -1) === null}
        onMouseDown={keepFocus}
        onClick={() => {
          focus.step(-1);
        }}
      >
        {/* I18N-05: directional, so both chevrons mirror under RTL. */}
        <ChevronLeft aria-hidden className="size-4 rtl:rotate-180" />
        {t.stepPrevious}
      </Button>

      <p className="text-fg-muted flex-1 text-center text-xs tabular-nums">
        {formatTemplate(t.stepPosition, {
          current: formatNumber(order.indexOf(activeId) + 1, locale),
          total: formatNumber(order.length, locale),
        })}
      </p>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 px-2"
        disabled={stepFrom(order, activeId, 1) === null}
        onMouseDown={keepFocus}
        onClick={() => {
          focus.step(1);
        }}
      >
        {t.stepNext}
        <ChevronRight aria-hidden className="size-4 rtl:rotate-180" />
      </Button>

      <Button type="button" variant="secondary" size="sm" onClick={focus.leave}>
        {t.stepDone}
      </Button>
    </div>
  );
}
