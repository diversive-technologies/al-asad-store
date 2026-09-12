import { describe, expect, it } from 'vitest';

import { acknowledgementSchema, type Acknowledgement } from '../schemas/profile.schema';
import { keyOf, sentKey, stepOf, submissionOf, type RequestState } from './studio-step';
import { pointId, servedSet } from './test-support';
import type { CheckVerdict } from './verdicts';

const STUDIO = servedSet('KAMEEZ_SHALWAR');

const kept = (point: string): Acknowledgement =>
  acknowledgementSchema.parse({
    ruleId: 'shoulderForChest',
    pointId: point,
    direction: 'BELOW',
  });

const entries = [
  { pointId: pointId('kameezShoulder'), raw: '17', unit: 'IN' as const },
  { pointId: pointId('kameezChest'), raw: '21', unit: 'IN' as const },
];

describe('what is sent', () => {
  it('carries the figures kept against a rule', () => {
    const sent = submissionOf(STUDIO, entries, [], [kept('kameezShoulder')]);
    expect(sent.acknowledgedFindings).toEqual([kept('kameezShoulder')]);
  });

  it('sends an answer only for a figure that is going too', () => {
    // A point set aside by a finishing choice is not sent, so nothing about it is.
    const sent = submissionOf(STUDIO, entries, [], [kept('kameezCuff')]);
    expect(sent.acknowledgedFindings).toEqual([]);
  });

  it('sends none where nothing was kept', () => {
    expect(submissionOf(STUDIO, entries, []).acknowledgedFindings).toEqual([]);
  });
});

describe('where the studio is', () => {
  const idle = { data: undefined, variables: undefined, isPending: false, isError: false };

  it('carries what the server counted as kept into the review', () => {
    const sent = submissionOf(STUDIO, entries, [], [kept('kameezShoulder')]);
    const passed: CheckVerdict = {
      kind: 'PASSED',
      recorded: new Map([[pointId('kameezChest'), 1067]]),
      acknowledged: [kept('kameezShoulder')],
    };
    const checking: RequestState<CheckVerdict> = { ...idle, data: passed, variables: sent };

    const step = stepOf('REVIEWING', sentKey(sent), checking, idle);
    if (step.kind !== 'REVIEWING') throw new Error('expected the review');
    // What the save re-sends is exactly what this check was answered with.
    expect(step.checked.acknowledged).toEqual([kept('kameezShoulder')]);
    expect(step.checked.entries).toEqual(entries);
  });

  it('is the fields while an answer is about another list or other choices', () => {
    const sent = submissionOf(STUDIO, entries, []);
    const checking: RequestState<CheckVerdict> = {
      ...idle,
      data: { kind: 'STALE' },
      variables: sent,
    };
    const elsewhere = keyOf({ ...STUDIO, version: 99 }, []);
    expect(stepOf('EDITING', elsewhere, checking, idle)).toEqual({
      kind: 'EDITING',
      isChecking: false,
      problem: null,
    });
  });
});
