import { describe, expect, it } from 'vitest';

import { styleOffersSchema } from '@/lib/domain/style-offer';
import { measurementCopyFor } from '@/lib/mocks/measurement-copy-db';
import { STYLE_OFFERS } from '@/lib/mocks/measurement-sets-db';

import { measurementCopySchema } from '../schemas/measurement-copy.schema';
import { measurementProfileSchema, type MeasurementProfile } from '../schemas/profile.schema';
import { checkedFromProfile, figuresNotAsked, savedGroups } from './saved-view';
import { joinCopy, type StudioSet } from './studio-set';
import { pointId, servedSet } from './test-support';

/* The real served list and the real wording, so these run against the shapes the
   account page is handed rather than a hand-made copy of them. */
function studioFor(garmentStyle: string, source?: string): StudioSet {
  /* Through the real contracts, because the ids are BRANDED: the account page is
     handed parsed values, never bare strings. */
  const copy = measurementCopySchema.parse(measurementCopyFor('en'));
  const offers = styleOffersSchema.parse(STYLE_OFFERS);
  const joined = joinCopy(servedSet(garmentStyle, source), offers, copy);
  if (!joined.ok) throw new Error(`no wording for ${joined.error.join(', ')}`);
  return joined.value.studio;
}

interface SavedValue {
  readonly pointId: string;
  readonly enteredValue: string;
  readonly valueMm: number;
  readonly enteredAs?: 'HALF' | 'FULL';
}

function profile(
  values: readonly SavedValue[],
  extra: { readonly acknowledgedFindings?: readonly unknown[] } = {},
): MeasurementProfile {
  return measurementProfileSchema.parse({
    id: '00000000-0000-4000-8000-000000000001',
    garmentStyle: 'KAMEEZ_SHALWAR',
    setVersion: 1,
    ruleSetVersion: 1,
    version: 1,
    source: 'GARMENT_COPY',
    preferences: [],
    values: values.map((value) => ({
      pointId: value.pointId,
      enteredValue: value.enteredValue,
      unitEntered: 'IN',
      enteredAs: value.enteredAs ?? 'HALF',
      basis: 'GARMENT',
      origin: 'TYPED',
      valueMm: value.valueMm,
    })),
    acknowledgedFindings: extra.acknowledgedFindings ?? [],
    keptWith: 'DEVICE',
    createdAt: '2026-09-16T10:00:00.000Z',
  });
}

describe('a saved profile, read back through the review’s own rows', () => {
  it('carries what was typed beside what was recorded', () => {
    const checked = checkedFromProfile(
      profile([{ pointId: 'kameezChest', enteredValue: '21', valueMm: 1067 }]),
    );

    expect(checked.entries).toEqual([{ pointId: 'kameezChest', raw: '21', unit: 'IN' }]);
    expect(checked.recorded.get(pointId('kameezChest'))).toBe(1067);
  });

  it('groups the figures garment by garment, in the served order', () => {
    const groups = savedGroups(
      studioFor('KAMEEZ_SHALWAR'),
      profile([
        { pointId: 'kameezChest', enteredValue: '21', valueMm: 1067 },
        { pointId: 'shalwarLength', enteredValue: '40', valueMm: 1016, enteredAs: 'FULL' },
      ]),
    );

    expect(groups.map((group) => group.piece.id)).toEqual(['KAMEEZ', 'SHALWAR']);
    expect(groups[0]?.rows.map((row) => row.point.id)).toEqual(['kameezChest']);
    expect(groups[0]?.rows[0]?.valueMm).toBe(1067);
    // The words come from the served copy, not from a message file.
    expect(groups[0]?.rows[0]?.point.label.length).toBeGreaterThan(0);
  });

  it('marks a figure the customer was asked about and kept', () => {
    const groups = savedGroups(
      studioFor('KAMEEZ_SHALWAR'),
      profile(
        [{ pointId: 'kameezShoulder', enteredValue: '16', valueMm: 406, enteredAs: 'FULL' }],
        {
          acknowledgedFindings: [
            { ruleId: 'shoulderForChest', pointId: 'kameezShoulder', direction: 'BELOW' },
          ],
        },
      ),
    );

    expect(groups[0]?.rows[0]?.kept).toBe(true);
  });

  it('leaves a garment with no saved figures out entirely', () => {
    const groups = savedGroups(
      studioFor('KAMEEZ_SHALWAR'),
      profile([{ pointId: 'kameezChest', enteredValue: '21', valueMm: 1067 }]),
    );

    expect(groups.map((group) => group.piece.id)).toEqual(['KAMEEZ']);
  });
});

describe('figures on file the list no longer asks for', () => {
  /* `savedGroups` walks the LIST, so a point the guide has dropped simply does
     not appear — which would quietly show fewer figures than were given. */
  it('counts them, so the page can say so rather than swallow them', () => {
    const saved = profile([
      { pointId: 'kameezChest', enteredValue: '21', valueMm: 1067 },
      // A waistcoat point on a kameez shalwar list: on file, not asked here.
      { pointId: 'waistcoatChest', enteredValue: '20', valueMm: 1016 },
    ]);

    expect(figuresNotAsked(studioFor('KAMEEZ_SHALWAR'), saved)).toBe(1);
    expect(figuresNotAsked(studioFor('WAISTCOAT_SUIT'), saved)).toBe(0);
  });
});
