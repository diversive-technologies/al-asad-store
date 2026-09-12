/**
 * The two figures a review row shows, in words: as the customer typed it, and as
 * it will be kept.
 *
 * MOD-04 — pure. The kept figure is the SERVER's millimetres (`keptFigure`);
 * nothing here derives a record.
 */

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { assertNever } from '@/lib/result';
import { formatNumber, formatTemplate } from '@/lib/utils/format';

import type { CaptureSource } from '../schemas/measurement-set.schema';
import { readingOf } from './garments';
import { keptFigure, type ReviewRow } from './review';
import { unitSuffix } from './units';

type StudioCopy = Messages['madeToMeasure'];

/**
 * The figure exactly as TYPED — never re-formatted. On the garment path a half
 * says "across" or "half"; off a card it is the bare figure, character for
 * character what the card says, so the two can be compared at a glance.
 */
export function typedText(row: ReviewRow, t: StudioCopy, source: CaptureSource): string {
  const figure = formatTemplate(t.readout, {
    value: row.entry.raw,
    unit: unitSuffix(row.entry.unit, t),
  });
  if (source === 'TAILOR_CARD') return figure;
  const reading = readingOf(row.point);
  switch (reading) {
    case 'HALF_GIRTH':
      return formatTemplate(t.readoutAcross, { value: figure });
    case 'HALF_WIDTH':
      return formatTemplate(t.readoutHalfTyped, { value: figure });
    case 'FULL_GIRTH':
    case 'STRAIGHT':
      return figure;
    default:
      return assertNever(reading);
  }
}

/**
 * The figure as it will be KEPT — the server's millimetres, shown in the unit the
 * customer typed in (`keptFigure`), and "around" for every girth, because the
 * record is always the way round. Display only: the record is the server's.
 */
export function keptText(row: ReviewRow, t: StudioCopy, locale: Locale): string {
  const figure = formatTemplate(t.readout, {
    value: formatNumber(keptFigure(row), locale),
    unit: unitSuffix(row.entry.unit, t),
  });
  return row.point.kind === 'GIRTH' ? formatTemplate(t.readoutAround, { value: figure }) : figure;
}
