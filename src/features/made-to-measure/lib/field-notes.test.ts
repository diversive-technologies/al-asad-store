import { describe, expect, it } from 'vitest';

import { acknowledgementSchema, findingSchema, type Finding } from '../schemas/profile.schema';
import { acknowledgementOf, answers, isNote, noteKey, type Note } from './field-notes';

const ASKED = {
  pointId: 'kameezShoulder',
  ruleId: 'shoulderForChest',
  severity: 'CONFIRM',
  reason: 'DEVIATION',
  relatedPoints: ['kameezChest'],
  direction: 'BELOW',
  expectedMm: null,
};

const findingOf = (overrides: Record<string, unknown> = {}): Finding =>
  findingSchema.parse({ ...ASKED, ...overrides });

const noteOf = (overrides: Record<string, unknown> = {}): Note => {
  const finding = findingOf(overrides);
  if (!isNote(finding)) throw new Error('expected a note');
  return finding;
};

describe('what a customer can answer', () => {
  it('is a finding that asks, and names both a rule and a field', () => {
    expect(isNote(findingOf())).toBe(true);
    expect(isNote(findingOf({ severity: 'REFUSED' }))).toBe(false);
    // Nothing could be kept against these, so they are never offered as notes.
    expect(isNote(findingOf({ ruleId: null, severity: 'REFUSED' }))).toBe(false);
    expect(isNote(findingOf({ pointId: null, severity: 'REFUSED' }))).toBe(false);
  });

  it('counts the direction as part of the question', () => {
    // A figure that moves from too small to too large is a new question, and an
    // answer to the old one must not cover it.
    expect(noteKey(noteOf())).not.toBe(noteKey(noteOf({ direction: 'ABOVE' })));
    // What the note says about itself is not part of it.
    expect(noteKey(noteOf())).toBe(noteKey(noteOf({ relatedPoints: [], expectedMm: 400 })));
  });

  it('answers a finding by rule, field and direction alone', () => {
    const kept = acknowledgementOf(noteOf());
    expect(kept).toEqual(
      acknowledgementSchema.parse({
        ruleId: 'shoulderForChest',
        pointId: 'kameezShoulder',
        direction: 'BELOW',
      }),
    );
    expect(answers(kept, findingOf())).toBe(true);
    expect(answers(kept, findingOf({ direction: 'ABOVE' }))).toBe(false);
    expect(answers(kept, findingOf({ pointId: 'kameezChest' }))).toBe(false);
    expect(answers(kept, findingOf({ ruleId: 'neckForChestBan' }))).toBe(false);
  });
});
