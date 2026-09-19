import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';
import { ur } from '@/i18n/messages/ur';
import { styleOffersSchema } from '@/lib/domain/style-offer';
import { measurementCopyFor } from '@/lib/mocks/measurement-copy-db';
import { STYLE_OFFERS } from '@/lib/mocks/measurement-sets-db';

import { measurementCopySchema } from '../schemas/measurement-copy.schema';
import type { ReviewRow } from './review';
import { keptText, typedText } from './review-text';
import { joinCopy, type StudioSet } from './studio-set';
import { servedSet } from './test-support';
import type { Unit } from './units';

/* The real served lists and their real wording, parsed through the contracts —
   the review and the account page are handed these, never bare strings. */
function studioFor(source?: string): StudioSet {
  const joined = joinCopy(
    servedSet('KAMEEZ_SHALWAR', source),
    styleOffersSchema.parse(STYLE_OFFERS),
    measurementCopySchema.parse(measurementCopyFor('en')),
  );
  if (!joined.ok) throw new Error(`no wording for ${joined.error.join(', ')}`);
  return joined.value.studio;
}

const GARMENT = studioFor();
const CARD = studioFor('TAILOR_CARD');

/** A review row as the review builds one: what was typed, and what the server recorded. */
function row(studio: StudioSet, id: string, raw: string, unit: Unit, valueMm: number): ReviewRow {
  const point = studio.points.find((candidate) => candidate.id === id);
  if (point === undefined) throw new Error(`no point ${id} on ${studio.source}`);
  return { point, entry: { pointId: point.id, raw, unit }, valueMm, kept: false };
}

describe('a figure as typed, on the copy-a-garment path', () => {
  const t = en.madeToMeasure;

  it.each([
    ['a chest, read across the flat garment', 'kameezChest', '21', 'IN', '21 in across'],
    ['a neck, read all the way round', 'kameezNeck', '15.5', 'IN', '15.5 in'],
    ['a sleeve, read straight off the tape', 'kameezSleeve', '24', 'IN', '24 in'],
    ['a shoulder, read whole', 'kameezShoulder', '18', 'IN', '18 in'],
    ['a hem in centimetres', 'kameezBottom', '66', 'CM', '66 cm across'],
  ] as const)('says %s', (_label, id, raw, unit, expected) => {
    expect(typedText(row(GARMENT, id, raw, unit, 0), t, 'GARMENT_COPY')).toBe(expected);
  });

  it('keeps the figure exactly as it was typed rather than re-formatting it', () => {
    expect(typedText(row(GARMENT, 'kameezChest', '19.50', 'IN', 0), t, 'GARMENT_COPY')).toBe(
      '19.50 in across',
    );
  });

  it('says a half width is a half wherever the figure is not a card’s', () => {
    expect(typedText(row(CARD, 'kameezCardTeera', '8.5', 'IN', 0), t, 'GARMENT_COPY')).toBe(
      '8.5 in half',
    );
  });

  it('reads in Urdu with the Urdu unit and wording', () => {
    expect(
      typedText(row(GARMENT, 'kameezChest', '21', 'IN', 0), ur.madeToMeasure, 'GARMENT_COPY'),
    ).toBe('21 انچ آر پار');
  });
});

describe("a figure as typed, off a tailor's card", () => {
  /* Character for character what the card says, so the two can be compared at a
     glance — a card's half is not called "across", and its teera is not "half". */
  it.each([
    ['kameezCardChest', '19.5'],
    ['kameezCardTeera', '8.5'],
    ['kameezCardCuff', '8.5'],
  ])('shows %s as the bare figure', (id, raw) => {
    expect(typedText(row(CARD, id, raw, 'IN', 0), en.madeToMeasure, 'TAILOR_CARD')).toBe(
      `${raw} in`,
    );
  });
});

describe('a figure as it will be kept', () => {
  const t = en.madeToMeasure;

  it.each([
    [
      'a half girth doubled to the way round',
      GARMENT,
      'kameezChest',
      '21',
      'IN',
      1067,
      '42 in around',
    ],
    [
      'a full girth, still the way round',
      GARMENT,
      'kameezNeck',
      '15.5',
      'IN',
      394,
      '15.5 in around',
    ],
    ['a length, as it is', GARMENT, 'kameezSleeve', '24', 'IN', 610, '24 in'],
    ['a half girth in centimetres', GARMENT, 'kameezChest', '53.3', 'CM', 1066, '106.6 cm around'],
    ["a card's half chest, doubled", CARD, 'kameezCardChest', '19.5', 'IN', 991, '39 in around'],
    ["a card's teera, doubled to the shoulder", CARD, 'kameezCardTeera', '8.5', 'IN', 432, '17 in'],
    ["a card's whole cuff", CARD, 'kameezCardCuff', '8.5', 'IN', 216, '8.5 in around'],
  ] as const)('says %s', (_label, studio, id, raw, unit, valueMm, expected) => {
    expect(keptText(row(studio, id, raw, unit, valueMm), t, 'en')).toBe(expected);
  });

  it("shows the customer's own figure where the record only differs by its rounding", () => {
    // 24 in is 609.6 mm, recorded as 610 — straight back that would read 24.02.
    expect(keptText(row(GARMENT, 'kameezSleeve', '24', 'IN', 610), t, 'en')).toBe('24 in');
  });

  it('lets the record speak where the server kept something else', () => {
    // 25 in across should be kept as 1270 mm around; a server holding it whole keeps 635.
    expect(keptText(row(GARMENT, 'kameezChest', '25', 'IN', 635), t, 'en')).toBe('25 in around');
  });

  it('reads in Urdu with the Urdu unit and wording', () => {
    expect(keptText(row(GARMENT, 'kameezChest', '21', 'IN', 1067), ur.madeToMeasure, 'ur')).toBe(
      '42 انچ گھیر',
    );
  });
});
