import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import {
  measurementCheckSchema,
  measurementSubmissionSchema,
  saveOutcomeSchema,
} from './profile.schema';

const SUBMISSION: z.input<typeof measurementSubmissionSchema> = {
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

/*
 * The backend's answers to it, as the wire carries them. What the server finds
 * and records is its own to decide (§34.4), and is tested there; these pin only
 * the SHAPE the studio reads. The millimetres are the server's for SUBMISSION —
 * a half doubled, then rounded once.
 */
const CHECKED = {
  findings: [],
  recorded: [
    { pointId: 'kameezLength', valueMm: 1016 },
    { pointId: 'kameezSleeve', valueMm: 610 },
    { pointId: 'kameezShoulder', valueMm: 457 },
    { pointId: 'kameezNeck', valueMm: 394 },
    { pointId: 'kameezChest', valueMm: 1067 },
    { pointId: 'kameezBottom', valueMm: 1118 },
    { pointId: 'shalwarLength', valueMm: 1016 },
    { pointId: 'shalwarPaincha', valueMm: 381 },
  ],
  acknowledged: [],
  ruleSetVersion: 2,
} satisfies z.input<typeof measurementCheckSchema>;

const SAVED = {
  kind: 'SAVED',
  profile: {
    id: crypto.randomUUID(),
    garmentStyle: 'KAMEEZ_SHALWAR',
    setVersion: 1,
    ruleSetVersion: 2,
    version: 1,
    source: 'GARMENT_COPY',
    preferences: SUBMISSION.preferences,
    // A2-8 — each value keeps what was typed beside what was recorded.
    values: [
      {
        pointId: 'kameezChest',
        enteredValue: '21',
        unitEntered: 'IN',
        enteredAs: 'HALF',
        basis: 'GARMENT',
        origin: 'TYPED',
        valueMm: 1067,
      },
    ],
    acknowledgedFindings: [],
    keptWith: 'DEVICE',
    createdAt: '2026-09-28T10:00:00.000Z',
  },
  replaced: false,
} satisfies z.input<typeof saveOutcomeSchema>;

// Sent against a list version the backend does not know.
const REJECTED = {
  kind: 'REJECTED',
  findings: [
    {
      pointId: null,
      ruleId: null,
      severity: 'REFUSED',
      reason: 'SET_VERSION_UNKNOWN',
      relatedPoints: [],
      direction: null,
      expectedMm: null,
    },
  ],
} satisfies z.input<typeof saveOutcomeSchema>;

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
    const parsed = measurementCheckSchema.safeParse(CHECKED);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.recorded).toEqual(CHECKED.recorded);
  });

  it.each([
    ['a saved profile', SAVED],
    ['a refusal', REJECTED],
  ])('reads %s', (_label, outcome) => {
    expect(saveOutcomeSchema.safeParse(outcome).success).toBe(true);
  });
});
