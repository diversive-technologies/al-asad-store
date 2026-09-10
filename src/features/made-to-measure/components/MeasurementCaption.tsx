'use client';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatNumber, formatTemplate } from '@/lib/utils/format';

import { storedFromEntered, type Measurement } from '../lib/garments';
import { fromMm, toMm, type Unit } from '../lib/units';

/**
 * What the drawing is currently saying.
 *
 * A ring is entered ACROSS the flat garment and recorded as the way round, so
 * both figures are shown: the one the tape is reading, and the one that ends up
 * on the tailor's card. Showing only the doubled figure invites somebody to type
 * a circumference they guessed at instead of measuring across.
 */
export function MeasurementCaption({
  active,
  entered,
  unit,
  messages,
  locale,
}: {
  readonly active: Measurement | null;
  /** The figure in the field, or null while it is empty or out of bounds. */
  readonly entered: number | null;
  readonly unit: Unit;
  readonly messages: Messages;
  readonly locale: Locale;
}) {
  const t = messages.madeToMeasure;

  if (active === null) return <p className="mm-scene-idle">{t.figureHint}</p>;

  const unitSuffix = unit === 'IN' ? t.unitShortInches : t.unitShortCentimetres;
  const figure = (value: number): string =>
    formatTemplate(t.readout, { value: formatNumber(value, locale), unit: unitSuffix });

  const readout =
    entered === null
      ? null
      : active.annotation.shape === 'SPAN'
        ? figure(entered)
        : formatTemplate(t.readoutRing, {
            across: figure(entered),
            around: figure(fromMm(storedFromEntered(active, toMm(entered, unit)), unit)),
          });

  return (
    <div className="mm-scene-caption">
      <p className="mm-scene-name">{t.points[active.id].label}</p>
      <p className="mm-scene-how">{active.annotation.shape === 'RING' ? t.ringHint : t.spanHint}</p>
      {readout === null ? null : <p className="mm-scene-readout">{readout}</p>}
    </div>
  );
}
