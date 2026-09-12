import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';
import type { MeasurementPointId } from '@/lib/domain/ids';
import { styleOffersSchema } from '@/lib/domain/style-offer';
import { measurementCopyFor } from '@/lib/mocks/measurement-copy-db';

import { measurementCopySchema } from '../schemas/measurement-copy.schema';
import { acknowledgementSchema, findingSchema, preferenceSchema } from '../schemas/profile.schema';
import { describeProblems, type FieldProblem } from './field-problems';
import { keptFigure, reviewGroups } from './review';
import { joinCopy } from './studio-set';
import { pointId, servedSet } from './test-support';

const joined = joinCopy(
  servedSet('KAMEEZ_SHALWAR'),
  styleOffersSchema.parse([{ garmentStyle: 'KAMEEZ_SHALWAR', leadTimeDays: 7 }]),
  measurementCopySchema.parse(measurementCopyFor('en')),
);
if (!joined.ok) throw new Error(`missing: ${joined.error.join(', ')}`);
const STUDIO = joined.value.studio;

const hemBelowChest = findingSchema.parse({
  pointId: 'kameezBottom',
  ruleId: 'hemAtLeastChest',
  severity: 'REFUSED',
  reason: 'ORDER',
  relatedPoints: ['kameezChest'],
  direction: 'BELOW',
  expectedMm: 1400,
});

describe('the review', () => {
  const groups = reviewGroups(STUDIO, {
    entries: [
      { pointId: pointId('shalwarLength'), raw: '40', unit: 'IN' },
      { pointId: pointId('kameezChest'), raw: '21', unit: 'IN' },
      // Sent, but not recorded, so not shown as if it would be kept.
      { pointId: pointId('kameezCuff'), raw: '4', unit: 'IN' },
    ],
    preferences: [preferenceSchema.parse({ group: 'sleeveFinish', value: 'PLAIN' })],
    recorded: new Map([
      [pointId('kameezChest'), 1067],
      [pointId('shalwarLength'), 1016],
    ]),
    acknowledged: [
      acknowledgementSchema.parse({
        ruleId: 'shoulderForChest',
        pointId: 'kameezChest',
        direction: 'BELOW',
      }),
    ],
  });

  it('lists what was sent and stands, garment by garment, in the served order', () => {
    expect(groups.map((group) => [group.piece.id, group.rows.map((row) => row.point.id)])).toEqual(
      [
        ['KAMEEZ', ['kameezChest']],
        ['SHALWAR', ['shalwarLength']],
      ],
    );
  });

  it('marks the figures the customer was asked about and kept', () => {
    expect(groups.flatMap((group) => group.rows.map((row) => [row.point.id, row.kept]))).toEqual([
      ['kameezChest', true],
      ['shalwarLength', false],
    ]);
  });

  it('names the finishing choices each garment was measured for', () => {
    expect(groups.map((group) => group.choices)).toEqual([
      [{ id: 'sleeveFinish', group: 'Sleeve end', value: 'Plain' }],
      [],
    ]);
  });
});

describe('the kept figure', () => {
  const row = (id: string, raw: string, unit: 'IN' | 'CM', valueMm: number) => {
    const point = STUDIO.points.find((candidate) => candidate.id === id);
    if (point === undefined) throw new Error(`no point ${id}`);
    return { point, entry: { pointId: point.id, raw, unit }, valueMm, kept: false };
  };

  it("shows the customer's own figure where the record is within its rounding of it", () => {
    // 24 in is 609.6 mm, kept as 610 — straight back that reads 24.02.
    expect(keptFigure(row('kameezSleeve', '24', 'IN', 610))).toBe(24);
    expect(keptFigure(row('kameezShoulder', '18', 'IN', 457))).toBe(18);
    // A half is shown doubled: 26 in across is kept as 52 in around.
    expect(keptFigure(row('kameezBottom', '26', 'IN', 1321))).toBe(52);
  });

  it('lets the record speak where it differs, so a different convention shows', () => {
    // 25 in across should be 1270 mm around; a server holding the chest FULL keeps 635.
    expect(keptFigure(row('kameezChest', '25', 'IN', 635))).toBe(25);
  });
});

describe('what a field with a problem says', () => {
  const say = (
    problems: ReadonlyMap<MeasurementPointId, FieldProblem>,
    values: Readonly<Record<string, string>> = {},
  ) =>
    describeProblems(
      STUDIO.points,
      problems,
      { unit: 'IN', locale: 'en', values, source: 'GARMENT_COPY' },
      en.madeToMeasure,
    );

  it('says a figure looks written the other way, rather than the bare range', () => {
    // 42 in is a plausible chest all the way round, and twice too wide across.
    const chest = new Map<MeasurementPointId, FieldProblem>([[pointId('kameezChest'), 'RANGE']]);
    expect(say(chest, { kameezChest: '42' }).get(pointId('kameezChest'))).toBe(
      en.madeToMeasure.findingLooksWhole,
    );
  });

  it('names the measurement a hem came out narrower than, and asks for both again', () => {
    expect(say(new Map([[pointId('kameezBottom'), hemBelowChest]])).get(pointId('kameezBottom'))).toBe(
      'This came out smaller than the Chest, which cannot be right. Measure this again, and the Chest too.',
    );
  });

  it('says only that two figures disagree when the rule gives no direction', () => {
    const undirected = { ...hemBelowChest, direction: null };
    expect(say(new Map([[pointId('kameezBottom'), undirected]])).get(pointId('kameezBottom'))).toBe(
      'This does not agree with the Chest. Measure this again, and the Chest too.',
    );
  });

  it('names nothing this page does not have', () => {
    const offList = { ...hemBelowChest, relatedPoints: [pointId('waistcoatChest')] };
    expect(say(new Map([[pointId('kameezBottom'), offList]])).get(pointId('kameezBottom'))).toBe(
      'This is unusual beside your other figures. Measure it again.',
    );
  });

  it("states the range the field accepts, for its own check and for the server's", () => {
    const outOfRange = findingSchema.parse({
      ...hemBelowChest,
      pointId: 'kameezChest',
      ruleId: null,
      reason: 'OUT_OF_RANGE',
      relatedPoints: [],
      direction: 'ABOVE',
      expectedMm: 1500,
    });
    const described = say(
      new Map<MeasurementPointId, FieldProblem>([
        [pointId('kameezChest'), outOfRange],
        [pointId('kameezNeck'), 'RANGE'],
      ]),
    );
    expect(described.get(pointId('kameezChest'))).toBe('Enter a value between 15.75 and 29.52 in.');
    expect(described.get(pointId('kameezNeck'))).toBe('Enter a value between 13 and 21.45 in.');
  });
});
