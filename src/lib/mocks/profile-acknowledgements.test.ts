import { describe, expect, it } from 'vitest';

import { currentRuleSet } from './profile-rule-rows';
import { isMalformed } from './profile-submission';
import {
  checkSubmission,
  profilesFor,
  saveProfile,
  type AcknowledgementRow,
  type ProfileOwnerRow,
  type SubmissionRow,
  type TypedEntryRow,
} from './profiles-db';

/*
 * Keeping a figure the rules called unusual (A2-5, A2-8). Owner keys are prefixed
 * so none can collide with `profiles-db.test.ts`, which shares the module's store.
 */

/* A complete kameez shalwar whose shoulder is 432 mm against the 465 a 1067 mm
   chest expects — 33 below a 25 mm tolerance, so one note and nothing else. */
const ENTRIES: TypedEntryRow[] = [
  { pointId: 'kameezLength', raw: '40', unit: 'IN' },
  { pointId: 'kameezSleeve', raw: '24', unit: 'IN' },
  { pointId: 'kameezShoulder', raw: '17', unit: 'IN' },
  { pointId: 'kameezNeck', raw: '15.5', unit: 'IN' },
  { pointId: 'kameezChest', raw: '21', unit: 'IN' },
  { pointId: 'kameezBottom', raw: '22', unit: 'IN' },
  { pointId: 'shalwarLength', raw: '40', unit: 'IN' },
  { pointId: 'shalwarPaincha', raw: '7.5', unit: 'IN' },
];

const KEPT: AcknowledgementRow = {
  ruleId: 'shoulderForChest',
  pointId: 'kameezShoulder',
  direction: 'BELOW',
};

const submission = (acknowledgedFindings: AcknowledgementRow[] = []): SubmissionRow => ({
  garmentStyle: 'KAMEEZ_SHALWAR',
  source: 'GARMENT_COPY',
  version: 1,
  entries: ENTRIES,
  preferences: [],
  acknowledgedFindings,
});

const device = (key: string): ProfileOwnerRow => ({ keptWith: 'DEVICE', key: `ack-${key}` });

describe('a figure the rules ask about (A2-5)', () => {
  it('stops the save while nobody has answered it, and stores nothing', () => {
    const owner = device('unanswered');
    const outcome = saveProfile(owner, submission());
    expect(outcome).toEqual({
      kind: 'REJECTED',
      findings: [
        expect.objectContaining({
          pointId: 'kameezShoulder',
          ruleId: 'shoulderForChest',
          severity: 'CONFIRM',
        }),
      ],
    });
    expect(profilesFor(owner, 'KAMEEZ_SHALWAR')).toHaveLength(0);
  });

  it('saves once the customer keeps their figure, recording what was kept', () => {
    const outcome = saveProfile(device('answered'), submission([KEPT]));
    if (outcome.kind !== 'SAVED') throw new Error('expected a save');
    expect(outcome.profile.acknowledgedFindings).toEqual([KEPT]);
    expect(outcome.profile.ruleSetVersion).toBe(currentRuleSet().version);
  });

  it('counts an answer only against a finding it actually made', () => {
    const junk: AcknowledgementRow[] = [
      // A rule that did not fire, the other direction, and a point not asked.
      { ruleId: 'hemAtLeastChest', pointId: 'kameezBottom', direction: 'BELOW' },
      { ruleId: 'shoulderForChest', pointId: 'kameezShoulder', direction: 'ABOVE' },
      { ruleId: 'shoulderForChest', pointId: 'kameezCuff', direction: 'BELOW' },
    ];
    // On their own they answer nothing, so the note still stands.
    expect(saveProfile(device('junk'), submission(junk)).kind).toBe('REJECTED');

    // Beside a real answer they are ignored rather than refused, and not stored.
    const outcome = saveProfile(device('junk-beside-real'), submission([...junk, KEPT]));
    if (outcome.kind !== 'SAVED') throw new Error('expected a save');
    expect(outcome.profile.acknowledgedFindings).toEqual([KEPT]);
  });

  it('treats one finding answered twice as a malformed request', () => {
    expect(isMalformed(submission([KEPT, { ...KEPT, direction: 'ABOVE' }]))).toBe(true);
    expect(isMalformed(submission([KEPT]))).toBe(false);
  });

  it('is per path: a garment point answers nothing on the card list', () => {
    const onCard: SubmissionRow = {
      garmentStyle: 'KAMEEZ_SHALWAR',
      source: 'TAILOR_CARD',
      version: 1,
      entries: [
        { pointId: 'kameezCardLength', raw: '40', unit: 'IN' },
        { pointId: 'kameezCardSleeve', raw: '24', unit: 'IN' },
        { pointId: 'kameezCardTeera', raw: '8.5', unit: 'IN' },
        { pointId: 'kameezCardNeck', raw: '15.5', unit: 'IN' },
        { pointId: 'kameezCardChest', raw: '19.5', unit: 'IN' },
        { pointId: 'kameezCardGhera', raw: '20.5', unit: 'IN' },
        { pointId: 'shalwarCardLength', raw: '40', unit: 'IN' },
        { pointId: 'shalwarCardPoncha', raw: '7.5', unit: 'IN' },
      ],
      preferences: [],
      acknowledgedFindings: [],
    };
    // A card teera of 7.5 is 381 mm against the 432 its chest expects.
    const short = onCard.entries.map((row) =>
      row.pointId === 'kameezCardTeera' ? { ...row, raw: '7.5' } : row,
    );
    const asked = { ...onCard, entries: short };
    expect(checkSubmission(asked).findings).toContainEqual(
      expect.objectContaining({ pointId: 'kameezCardTeera', ruleId: 'shoulderForChest' }),
    );

    const garmentAnswer = { ...asked, acknowledgedFindings: [KEPT] };
    expect(checkSubmission(garmentAnswer).acknowledged).toEqual([]);
    const cardAnswer = {
      ...asked,
      acknowledgedFindings: [
        { ruleId: 'shoulderForChest', pointId: 'kameezCardTeera', direction: 'BELOW' as const },
      ],
    };
    expect(checkSubmission(cardAnswer).acknowledged).toEqual(cardAnswer.acknowledgedFindings);
  });
});

describe('what validate answers', () => {
  it('moves an answered note out of the way and echoes it back', () => {
    const before = checkSubmission(submission());
    expect(before.findings.map((found) => found.ruleId)).toEqual(['shoulderForChest']);
    expect(before.acknowledged).toEqual([]);
    expect(before.ruleSetVersion).toBe(currentRuleSet().version);

    const after = checkSubmission(submission([KEPT]));
    expect(after.findings).toEqual([]);
    expect(after.acknowledged).toEqual([KEPT]);
    // What would be recorded is unchanged by keeping it.
    expect(after.recorded).toEqual(before.recorded);
  });

  it('answers a list version it cannot serve with nothing kept', () => {
    const stale = checkSubmission({ ...submission([KEPT]), version: 99 });
    expect(stale.findings).toEqual([
      expect.objectContaining({ pointId: null, reason: 'SET_VERSION_UNKNOWN' }),
    ]);
    expect(stale.acknowledged).toEqual([]);
    expect(stale.ruleSetVersion).toBe(currentRuleSet().version);
  });
});
