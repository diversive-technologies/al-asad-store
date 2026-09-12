import { describe, expect, it } from 'vitest';

import { checkSubmission, saveProfile, type SubmissionRow } from '@/lib/mocks/profiles-db';

import {
  measurementCheckSchema,
  measurementSubmissionSchema,
  saveOutcomeSchema,
} from './profile.schema';

const SUBMISSION: SubmissionRow = {
  garmentStyle: 'KAMEEZ_SHALWAR',
  source: 'GARMENT_COPY',
  version: 1,
  entries: [
    { pointId: 'kameezLength', raw: '40', unit: 'IN' },
    { pointId: 'kameezSleeve', raw: '24', unit: 'IN' },
    { pointId: 'kameezShoulder', raw: '18', unit: 'IN' },
    { pointId: 'kameezNeck', raw: '15.5', unit: 'IN' },
    { pointId: 'kameezChest', raw: '21', unit: 'IN' },
    { pointId: 'kameezBottom', raw: '22', unit: 'IN' },
    { pointId: 'shalwarLength', raw: '40', unit: 'IN' },
    { pointId: 'shalwarPaincha', raw: '7.5', unit: 'IN' },
  ],
  preferences: [{ group: 'sleeveFinish', value: 'CUFF' }],
  acknowledgedFindings: [],
};

describe('the save contract (A2-5, A2-8)', () => {
  it('accepts what the studio sends', () => {
    expect(measurementSubmissionSchema.safeParse(SUBMISSION).success).toBe(true);
  });

  it('carries figures and choices only — no field could hold a photo', () => {
    // A card's photo stays on the device (plan Phase 4, A2-13).
    expect(Object.keys(measurementSubmissionSchema.shape)).toEqual([
      'garmentStyle',
      'source',
      'version',
      'entries',
      'preferences',
      'acknowledgedFindings',
    ]);
  });

  it('refuses a unit it does not know and a figure no tape gives', () => {
    const withUnit = (unit: string) => ({
      ...SUBMISSION,
      entries: [{ pointId: 'kameezChest', raw: '21', unit }],
    });
    expect(measurementSubmissionSchema.safeParse(withUnit('MM')).success).toBe(false);
    expect(
      measurementSubmissionSchema.safeParse({
        ...SUBMISSION,
        entries: [{ pointId: 'kameezChest', raw: '1234567890123', unit: 'IN' }],
      }).success,
    ).toBe(false);
  });

  it("reads the backend's check in the shape the studio expects", () => {
    const parsed = measurementCheckSchema.safeParse(checkSubmission(SUBMISSION));
    expect(parsed.success).toBe(true);
    expect(parsed.data?.recorded).toHaveLength(8);
  });

  it('reads both a saved profile and a refusal', () => {
    const owner = { keptWith: 'DEVICE' as const, key: 'contract-test' };
    expect(saveOutcomeSchema.safeParse(saveProfile(owner, SUBMISSION)).success).toBe(true);
    expect(
      saveOutcomeSchema.safeParse(saveProfile(owner, { ...SUBMISSION, version: 99 })).success,
    ).toBe(true);
  });
});
