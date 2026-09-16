import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';
import { ur } from '@/i18n/messages/ur';
import { styleOffersSchema } from '@/lib/domain/style-offer';
import { measurementCopyFor } from '@/lib/mocks/measurement-copy-db';

import { measurementCopySchema } from '../schemas/measurement-copy.schema';
import { findingSchema } from '../schemas/profile.schema';
import { isNote, type Note } from './field-notes';
import { noteTextFor, type FieldNoteText, type NoteCopy } from './note-text';
import { joinCopy } from './studio-set';
import { servedSet } from './test-support';

const joined = joinCopy(
  servedSet('KAMEEZ_SHALWAR'),
  styleOffersSchema.parse([
    { garmentStyle: 'KAMEEZ_SHALWAR', leadTimeDays: 7, stitchingChargeMinor: 250000 },
  ]),
  measurementCopySchema.parse(measurementCopyFor('en')),
);
if (!joined.ok) throw new Error(`missing: ${joined.error.join(', ')}`);
const POINTS = joined.value.studio.points;

const noteOn = (overrides: Record<string, unknown> = {}): Note => {
  const finding = findingSchema.parse({
    pointId: 'kameezShoulder',
    ruleId: 'shoulderForChest',
    severity: 'CONFIRM',
    reason: 'DEVIATION',
    relatedPoints: ['kameezChest'],
    direction: 'BELOW',
    expectedMm: null,
    ...overrides,
  });
  if (!isNote(finding)) throw new Error('expected a note');
  return finding;
};

function said(
  note: Note,
  source: 'GARMENT_COPY' | 'TAILOR_CARD' = 'GARMENT_COPY',
  copy: NoteCopy = en.madeToMeasure,
  locale: 'en' | 'ur' = 'en',
): FieldNoteText {
  const text = noteTextFor([note], POINTS, { locale, source }, copy);
  if (text === null) throw new Error('expected a note');
  return text;
}

const everythingIn = (text: FieldNoteText): string =>
  [
    ...text.items.flatMap((item) => [item.text, item.keptText]),
    text.ask,
    text.againLabel,
    text.keepLabel,
  ].join(' ');

describe('what a note says', () => {
  it('follows the direction, and names the figure it was judged against', () => {
    expect(said(noteOn()).items[0]?.text).toBe(
      'This is smaller than usual beside your Chest. Cloth cut too small cannot be let out.',
    );
    expect(said(noteOn({ direction: 'ABOVE' })).items[0]?.text).toBe(
      'This is larger than usual beside your Chest.',
    );
  });

  it('names nothing this page does not have', () => {
    expect(said(noteOn({ relatedPoints: ['waistcoatChest'] })).items[0]?.text).toBe(
      'This is unusual beside your other figures.',
    );
  });

  it('never says "measure" off a card, and never says "card" off a garment', () => {
    const onCard = said(noteOn(), 'TAILOR_CARD');
    expect(everythingIn(onCard).toLowerCase()).not.toContain('measure');
    expect(onCard.againLabel).toBe('Check the card again');

    const onGarment = said(noteOn());
    expect([onGarment.ask, onGarment.againLabel, onGarment.keepLabel].join(' ')).not.toContain(
      'card',
    );
    expect(onGarment.againLabel).toBe('Measure again');
  });

  it('gives no figure to copy, whatever the server sent', () => {
    // The rules withhold the expected figure; the words could not print one anyway.
    for (const source of ['GARMENT_COPY', 'TAILOR_CARD'] as const) {
      expect(everythingIn(said(noteOn({ expectedMm: 465 }), source)), source).not.toMatch(/\d/);
    }
  });

  it('renders in Urdu, with the measurement named in the sentence', () => {
    const text = said(noteOn(), 'GARMENT_COPY', ur.madeToMeasure, 'ur');
    // The label is the served one, which this fixture holds in English.
    expect(text.items[0]?.text).toContain('Chest');
    expect(text.items[0]?.text).not.toContain('{related}');
    expect(text.againLabel).toBe(ur.madeToMeasure.noteMeasureAgain);
    expect(text.keepLabel).toBe(ur.madeToMeasure.noteKeep);
  });

  it('says nothing where there is nothing to say', () => {
    expect(
      noteTextFor([], POINTS, { locale: 'en', source: 'GARMENT_COPY' }, en.madeToMeasure),
    ).toBeNull();
  });
});
