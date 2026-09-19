import { describe, expect, it } from 'vitest';

import type { Locale } from '@/i18n/locales';
import { en } from '@/i18n/messages/en';
import { ur } from '@/i18n/messages/ur';
import { styleOffersSchema } from '@/lib/domain/style-offer';
import { measurementCopyFor } from '@/lib/mocks/measurement-copy-db';
import { STYLE_OFFERS } from '@/lib/mocks/measurement-sets-db';
import { formatList } from '@/lib/utils/format';

import type { UseFieldNotesResult } from '../hooks/use-field-notes';
import { measurementCopySchema } from '../schemas/measurement-copy.schema';
import { findingSchema, type Finding } from '../schemas/profile.schema';
import type { FieldProblem } from './field-problems';
import { isNote, type Note } from './field-notes';
import { formView, type FormView } from './form-view';
import { joinCopy, type StudioSet } from './studio-set';
import { pointId, servedSet } from './test-support';
import type { Unit } from './units';

/* The real served lists and their real wording, so the groups follow the order
   the backend serves rather than one written into the test. */
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

function labelOf(studio: StudioSet, id: string): string {
  const point = studio.points.find((candidate) => candidate.id === id);
  if (point === undefined) throw new Error(`no point ${id} on ${studio.source}`);
  return point.label;
}

function finding(overrides: Record<string, unknown>): Finding {
  return findingSchema.parse({
    ruleId: null,
    severity: 'REFUSED',
    relatedPoints: [],
    direction: null,
    expectedMm: null,
    ...overrides,
  });
}

function note(overrides: Record<string, unknown>): Note {
  const found = finding({
    ruleId: 'shoulderForChest',
    severity: 'CONFIRM',
    reason: 'DEVIATION',
    direction: 'BELOW',
    ...overrides,
  });
  if (!isNote(found)) throw new Error('expected a note');
  return found;
}

/**
 * The quiet channel as the form body holds it. `formView` only asks which notes
 * stand on a field; what the customer has kept is the hook's business, not this.
 */
function notesOn(notes: readonly Note[]): UseFieldNotesResult {
  return {
    on: (id) => notes.filter((candidate) => candidate.pointId === id),
    isKept: () => false,
    toggleKeep: () => undefined,
    acknowledged: () => [],
    outstanding: notes.length,
    place: () => undefined,
    summaryRef: { current: null },
  };
}

interface Asked {
  readonly studio?: StudioSet;
  readonly problems?: readonly (readonly [string, FieldProblem])[];
  readonly notes?: readonly Note[];
  readonly values?: Readonly<Record<string, string>>;
  readonly unit?: Unit;
  readonly locale?: Locale;
}

function view({
  studio = GARMENT,
  problems = [],
  notes = [],
  values = {},
  unit = 'IN',
  locale = 'en',
}: Asked): FormView {
  return formView(
    {
      studio,
      problems: new Map(problems.map(([id, problem]) => [pointId(id), problem])),
      notes: notesOn(notes),
      unit,
      values,
      locale,
    },
    locale === 'ur' ? ur.madeToMeasure : en.madeToMeasure,
  );
}

/** The summaries as ids, garment by garment — what the two lists above the form show. */
const listed = (groups: FormView['errorGroups']) =>
  groups.map((group) => [group.piece.id, group.points.map((point) => point.id)]);

const hemBelowChest = finding({
  pointId: 'kameezBottom',
  ruleId: 'hemAtLeastChest',
  reason: 'ORDER',
  relatedPoints: ['kameezChest'],
  direction: 'BELOW',
});
const lengthRequired = finding({ pointId: 'shalwarLength', reason: 'REQUIRED' });
const shoulderNote = note({ pointId: 'kameezShoulder', relatedPoints: ['kameezChest'] });

describe('a form with nothing to say', () => {
  it('says nothing under any field and lists nothing above them', () => {
    const shown = view({});

    expect([shown.problems.size, shown.notes.size]).toEqual([0, 0]);
    expect([shown.errorGroups, shown.noteGroups]).toEqual([[], []]);
  });
});

describe('what is wrong', () => {
  // Handed over out of order, to show the lists follow the served order instead.
  const shown = view({
    problems: [
      ['shalwarLength', lengthRequired],
      ['kameezBottom', hemBelowChest],
      ['kameezChest', 'RANGE'],
    ],
    values: { kameezChest: '42' },
  });

  it('puts each refusal under its own field, in words', () => {
    expect(Object.fromEntries(shown.problems)).toEqual({
      shalwarLength: en.madeToMeasure.findingRequired,
      kameezBottom: `This came out smaller than the ${labelOf(GARMENT, 'kameezChest')}, which cannot be right. Measure this again, and the ${labelOf(GARMENT, 'kameezChest')} too.`,
      // 42 in fits all the way round and not across, so it is named as written the other way.
      kameezChest: en.madeToMeasure.findingLooksWhole,
    });
  });

  it('lists the refused fields garment by garment, in the order the list is served', () => {
    expect(listed(shown.errorGroups)).toEqual([
      ['KAMEEZ', ['kameezChest', 'kameezBottom']],
      ['SHALWAR', ['shalwarLength']],
    ]);
  });

  it('leaves the quiet list empty, because a refusal is never a note', () => {
    expect([shown.notes.size, shown.noteGroups]).toEqual([0, []]);
  });
});

describe('what is only worth a second look', () => {
  const shown = view({ notes: [shoulderNote] });

  it('puts the note under its field, with the notes it was written from', () => {
    expect(shown.notes.get(pointId('kameezShoulder'))).toMatchObject({
      notes: [shoulderNote],
      text: {
        items: [
          {
            text: `This is smaller than usual beside your ${labelOf(GARMENT, 'kameezChest')}. Cloth cut too small cannot be let out.`,
          },
        ],
        againLabel: en.madeToMeasure.noteMeasureAgain,
        keepLabel: en.madeToMeasure.noteKeep,
      },
    });
  });

  it('lists it in its own summary and never among the errors', () => {
    expect(listed(shown.noteGroups)).toEqual([['KAMEEZ', ['kameezShoulder']]]);
    expect([shown.problems.size, shown.errorGroups]).toEqual([0, []]);
  });

  it('keeps both channels when one form has a refusal and a note', () => {
    const both = view({ problems: [['shalwarLength', lengthRequired]], notes: [shoulderNote] });

    expect([listed(both.errorGroups), listed(both.noteGroups)]).toEqual([
      [['SHALWAR', ['shalwarLength']]],
      [['KAMEEZ', ['kameezShoulder']]],
    ]);
  });
});

describe('what the words depend on', () => {
  it('says nothing about a measurement this list does not ask', () => {
    const shown = view({
      problems: [['waistcoatChest', finding({ pointId: 'waistcoatChest', reason: 'REQUIRED' })]],
      notes: [note({ pointId: 'waistcoatChest', ruleId: 'waistcoatChestForKameez' })],
    });

    expect([shown.problems.size, shown.notes.size, shown.errorGroups, shown.noteGroups]).toEqual([
      0,
      0,
      [],
      [],
    ]);
  });

  it('states the range in the unit on screen', () => {
    // 42 cm across is 84 cm around: in range as written, so it is the bare range.
    const shown = view({
      problems: [['kameezChest', 'RANGE']],
      values: { kameezChest: '42' },
      unit: 'CM',
    });

    expect(shown.problems.get(pointId('kameezChest'))).toBe('Enter a value between 40 and 75 cm.');
  });

  it("speaks of the card, not the tape, off a tailor's card", () => {
    const shown = view({
      studio: CARD,
      problems: [['kameezCardChest', 'RANGE']],
      notes: [note({ pointId: 'kameezCardTeera', relatedPoints: ['kameezCardChest'] })],
      values: { kameezCardChest: '39' },
    });

    expect(shown.problems.get(pointId('kameezCardChest'))).toBe(
      en.madeToMeasure.findingLooksWholeCard,
    );
    expect(shown.notes.get(pointId('kameezCardTeera'))).toMatchObject({
      text: {
        ask: en.madeToMeasure.noteAskCard,
        againLabel: en.madeToMeasure.noteCheckCard,
        keepLabel: en.madeToMeasure.noteKeepCard,
      },
    });
  });

  it('joins the measurements a finding names the way the language lists things', () => {
    const shown = view({
      problems: [
        [
          'kameezBottom',
          { ...hemBelowChest, relatedPoints: [pointId('kameezChest'), pointId('kameezShoulder')] },
        ],
      ],
      locale: 'ur',
    });
    const related = formatList(
      [labelOf(GARMENT, 'kameezChest'), labelOf(GARMENT, 'kameezShoulder')],
      'ur',
    );

    expect(shown.problems.get(pointId('kameezBottom'))).toContain(related);
  });
});
