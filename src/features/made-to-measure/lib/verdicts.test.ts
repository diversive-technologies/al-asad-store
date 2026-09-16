import { describe, expect, it } from 'vitest';

import { styleOffersSchema } from '@/lib/domain/style-offer';
import { measurementCopyFor } from '@/lib/mocks/measurement-copy-db';

import { measurementCopySchema } from '../schemas/measurement-copy.schema';
import {
  acknowledgementSchema,
  findingSchema,
  type Finding,
  type MeasurementCheck,
} from '../schemas/profile.schema';
import { joinCopy } from './studio-set';
import { pointId, servedSet } from './test-support';
import { judgeCheck, judgeRejection, splitOf } from './verdicts';

const joined = joinCopy(
  servedSet('KAMEEZ_SHALWAR'),
  styleOffersSchema.parse([
    { garmentStyle: 'KAMEEZ_SHALWAR', leadTimeDays: 7, stitchingChargeMinor: 250000 },
  ]),
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

const shoulderNote = findingSchema.parse({
  pointId: 'kameezShoulder',
  ruleId: 'shoulderForChest',
  severity: 'CONFIRM',
  reason: 'DEVIATION',
  relatedPoints: ['kameezChest'],
  direction: 'BELOW',
  expectedMm: null,
});

const aboutTheList = (reason: Finding['reason'], id: string | null = null): Finding =>
  findingSchema.parse({ ...hemBelowChest, pointId: id, ruleId: null, reason, relatedPoints: [] });

const check = (
  findings: Finding[],
  recorded: MeasurementCheck['recorded'] = [],
): MeasurementCheck => ({
  findings,
  recorded,
  acknowledged: [],
  ruleSetVersion: 2,
});

describe('what a check means', () => {
  it('passes when nothing stands in the way, carrying what each figure records as', () => {
    const kept = [
      acknowledgementSchema.parse({
        ruleId: 'shoulderForChest',
        pointId: 'kameezShoulder',
        direction: 'BELOW',
      }),
    ];
    const verdict = judgeCheck(
      { ...check([], [{ pointId: pointId('kameezChest'), valueMm: 991 }]), acknowledged: kept },
      STUDIO.points,
    );
    if (verdict.kind !== 'PASSED') throw new Error('expected a pass');
    expect(verdict.recorded.get(pointId('kameezChest'))).toBe(991);
    // What the SERVER counted as kept, so the review can mark exactly those rows.
    expect(verdict.acknowledged).toEqual(kept);
  });

  it('holds a figure the rules only ASK about on the fields, as a note', () => {
    expect(judgeCheck(check([shoulderNote]), STUDIO.points)).toEqual({
      kind: 'NOTED',
      findings: [shoulderNote],
    });
  });

  it('takes a refusal and every note beside it to the fields together', () => {
    const verdict = judgeCheck(check([hemBelowChest, shoulderNote]), STUDIO.points);
    expect(verdict).toEqual({ kind: 'REFUSED', findings: [hemBelowChest, shoulderNote] });
  });

  it('calls a finding about the list stale, by its reason', () => {
    for (const reason of ['SET_VERSION_UNKNOWN', 'SET_VERSION_SUPERSEDED'] as const) {
      expect(judgeCheck(check([aboutTheList(reason)]), STUDIO.points).kind, reason).toBe('STALE');
    }
  });

  it('calls a point this page does not have stale, a note included', () => {
    // Judged over EVERY finding: a note nobody can answer is a changed list too.
    const unknown = aboutTheList('UNKNOWN_POINT', 'waistcoatChest');
    expect(judgeCheck(check([unknown]), STUDIO.points).kind).toBe('STALE');
    const elsewhere = { ...shoulderNote, pointId: pointId('waistcoatChest') };
    expect(judgeCheck(check([elsewhere]), STUDIO.points).kind).toBe('STALE');
  });
});

describe('what a rejected save means', () => {
  it('puts every finding on the fields, a note nobody answered included', () => {
    expect(judgeRejection([shoulderNote], STUDIO.points)).toEqual({
      kind: 'REFUSED',
      findings: [shoulderNote],
    });
  });

  it('is stale when the list was retired under the page', () => {
    expect(judgeRejection([aboutTheList('SET_VERSION_SUPERSEDED')], STUDIO.points).kind).toBe(
      'STALE',
    );
  });
});

describe('which channel a finding belongs to', () => {
  it('routes by severity, and by nothing else', () => {
    expect(splitOf([hemBelowChest, shoulderNote])).toEqual({
      refused: [hemBelowChest],
      notes: [shoulderNote],
    });
  });
});
