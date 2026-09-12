'use client';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { assertNever } from '@/lib/result';
import { formatNumber, formatTemplate } from '@/lib/utils/format';

import { readingOf, storedFromEntered, type Reading } from '../lib/garments';
import type { StudioPoint } from '../lib/studio-set';
import { unitSuffix, type Unit } from '../lib/units';
import type { CaptureSource } from '../schemas/measurement-set.schema';

type StudioCopy = Messages['madeToMeasure'];

/*
 * What the customer is told about reading the tape — follows the arithmetic, never
 * the shape. Off a card there is no tape: the figure is copied exactly as written,
 * and the card path says so for every field.
 */
function hintFor(reading: Reading, source: CaptureSource, t: StudioCopy): string {
  if (source === 'TAILOR_CARD') return t.cardHint;
  switch (reading) {
    case 'HALF_GIRTH':
      return t.ringHint;
    case 'HALF_WIDTH':
      return t.halfWidthHint;
    case 'FULL_GIRTH':
      return t.fullGirthHint;
    case 'STRAIGHT':
      return t.spanHint;
    default:
      return assertNever(reading);
  }
}

export interface MeasurementCaptionProps {
  readonly active: StudioPoint | null;
  /** The figure in the field, or null while it is empty or out of bounds. */
  readonly entered: number | null;
  readonly unit: Unit;
  /** The path the list is for — a card is copied, not measured. */
  readonly source: CaptureSource;
  readonly messages: Messages;
  readonly locale: Locale;
}

/**
 * What the drawing is currently saying.
 *
 * A HALF figure is entered ACROSS the flat garment and recorded as the way round,
 * so both figures are shown: the one the tape is reading, and the one that ends up
 * on the tailor's card. Showing only the doubled figure invites somebody to type a
 * circumference they guessed at instead of measuring across. A girth read in FULL —
 * the neck, on its opened band — is shown as the way round it already is, and is
 * never described as doubled.
 */
export function MeasurementCaption({
  active,
  entered,
  unit,
  source,
  messages,
  locale,
}: MeasurementCaptionProps) {
  const t = messages.madeToMeasure;

  if (active === null) return <p className="mm-scene-idle">{t.figureHint}</p>;

  const figure = (value: number): string =>
    formatTemplate(t.readout, { value: formatNumber(value, locale), unit: unitSuffix(unit, t) });
  const reading = readingOf(active);

  const readout = (value: number): string => {
    const whole = figure(storedFromEntered(active, value));
    switch (reading) {
      case 'HALF_GIRTH':
        return formatTemplate(t.readoutRing, { across: figure(value), around: whole });
      case 'HALF_WIDTH':
        return formatTemplate(t.readoutHalf, { half: figure(value), whole });
      case 'FULL_GIRTH':
        return formatTemplate(t.readoutAround, { value: figure(value) });
      case 'STRAIGHT':
        return figure(value);
      default:
        return assertNever(reading);
    }
  };

  return (
    <div className="mm-scene-caption">
      <p className="mm-scene-name">{active.label}</p>
      <p className="mm-scene-how">{hintFor(reading, source, t)}</p>
      {entered === null ? null : <p className="mm-scene-readout">{readout(entered)}</p>}
    </div>
  );
}
