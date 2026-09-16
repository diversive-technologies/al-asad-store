import { describe, expect, it } from 'vitest';

import { measurementSetFor, versionsOf, type SetRow } from './measurement-sets-db';
import { deriveMm } from './profile-rules';
import { isMalformed } from './profile-submission';
import {
  checkSubmission,
  currentProfilesFor,
  isKnownOwner,
  issueDeviceToken,
  profileOwnerOf,
  profilesFor,
  saveProfile,
  type ProfileOwnerRow,
  type SetsFor,
  type SubmissionRow,
  type TypedEntryRow,
} from './profiles-db';

/* A kameez shalwar with every required figure in range: chest 21 in across is
   1067 mm around, and the hem at 22 across stays wider than it. */
const PAIR_ENTRIES: TypedEntryRow[] = [
  { pointId: 'kameezLength', raw: '40', unit: 'IN' },
  { pointId: 'kameezSleeve', raw: '24', unit: 'IN' },
  { pointId: 'kameezShoulder', raw: '18', unit: 'IN' },
  { pointId: 'kameezNeck', raw: '15.5', unit: 'IN' },
  { pointId: 'kameezChest', raw: '21', unit: 'IN' },
  { pointId: 'kameezBottom', raw: '22', unit: 'IN' },
  { pointId: 'shalwarLength', raw: '40', unit: 'IN' },
  { pointId: 'shalwarPaincha', raw: '7.5', unit: 'IN' },
];

function submission(
  changes: Record<string, Omit<TypedEntryRow, 'pointId'> | null> = {},
  overrides: Partial<SubmissionRow> = {},
): SubmissionRow {
  const entries = PAIR_ENTRIES.flatMap((entry) => {
    const change = changes[entry.pointId];
    if (change === null) return [];
    return [{ ...entry, ...change }];
  });
  return {
    garmentStyle: 'KAMEEZ_SHALWAR',
    source: 'GARMENT_COPY',
    version: 1,
    entries,
    preferences: [],
    acknowledgedFindings: [],
    ...overrides,
  };
}

/* The same eight measurements off a tailor's card: its own point ids, and the
   teera written as half the shoulder. */
function cardSubmission(overrides: Partial<SubmissionRow> = {}): SubmissionRow {
  return {
    garmentStyle: 'KAMEEZ_SHALWAR',
    source: 'TAILOR_CARD',
    version: 1,
    entries: [
      { pointId: 'kameezCardLength', raw: '40', unit: 'IN' },
      { pointId: 'kameezCardSleeve', raw: '24', unit: 'IN' },
      { pointId: 'kameezCardTeera', raw: '9', unit: 'IN' },
      { pointId: 'kameezCardNeck', raw: '15.5', unit: 'IN' },
      { pointId: 'kameezCardChest', raw: '21', unit: 'IN' },
      { pointId: 'kameezCardGhera', raw: '22', unit: 'IN' },
      { pointId: 'shalwarCardLength', raw: '40', unit: 'IN' },
      { pointId: 'shalwarCardPoncha', raw: '7.5', unit: 'IN' },
    ],
    preferences: [],
    acknowledgedFindings: [],
    ...overrides,
  };
}

function chestOf(set: SetRow | null) {
  const chest = set?.points.find((point) => point.id === 'kameezChest');
  if (chest === undefined) throw new Error('no chest');
  return chest;
}

const device = (key: string): ProfileOwnerRow => ({ keptWith: 'DEVICE', key });

/* The served v1, and a v2 that writes the chest FULL — so a test can hold a
   retired list beside a current one. */
const V1 = measurementSetFor('KAMEEZ_SHALWAR', 1);
if (V1 === null) throw new Error('no v1');
const V2: SetRow = {
  ...V1,
  version: 2,
  points: V1.points.map((point) =>
    point.id === 'kameezChest' ? { ...point, enteredAs: 'FULL' } : point,
  ),
};
const WITH_V2: SetsFor = (style, source) =>
  style === 'KAMEEZ_SHALWAR' && source === 'GARMENT_COPY' ? [V1, V2] : versionsOf(style, source);

describe('the server derives the record (A2-2)', () => {
  it('doubles before it rounds, so a half and its full figure make one record', () => {
    // 19.5 in across is 990.6 mm around, which is 991 — never the 990 that
    // rounding 495.3 first and doubling it gave.
    expect(deriveMm(chestOf(V1), '19.5', 'IN')).toBe(991);
  });

  it('makes the same record from either unit', () => {
    expect(deriveMm(chestOf(V1), '49.53', 'CM')).toBe(991);
    const shoulder = V1.points.find((point) => point.id === 'kameezShoulder');
    if (shoulder === undefined) throw new Error('no shoulder');
    expect(deriveMm(shoulder, '40', 'IN')).toBe(deriveMm(shoulder, '101.6', 'CM'));
  });

  it('records the same chest from a list version that writes it FULL', () => {
    expect(deriveMm(chestOf(V2), '39', 'IN')).toBe(991);
  });

  it('reads only a plain decimal figure', () => {
    for (const raw of ['0x15', '2.1e1', '+19', '18.125', '']) {
      expect(deriveMm(chestOf(V1), raw, 'IN'), raw).toBeNull();
    }
    const { findings } = checkSubmission(submission({ kameezChest: { raw: '0x15', unit: 'IN' } }));
    expect(findings).toContainEqual(
      expect.objectContaining({ pointId: 'kameezChest', reason: 'UNREADABLE' }),
    );
  });
});

describe('what the server refuses', () => {
  it('refuses a figure posted straight past the form, and saves nothing', () => {
    const outOfRange = submission({ kameezChest: { raw: '42', unit: 'IN' } });
    expect(checkSubmission(outOfRange).findings).toContainEqual(
      expect.objectContaining({
        pointId: 'kameezChest',
        reason: 'OUT_OF_RANGE',
        direction: 'ABOVE',
        expectedMm: 1500,
      }),
    );

    const owner = device('out-of-range');
    expect(saveProfile(owner, outOfRange).kind).toBe('REJECTED');
    expect(profilesFor(owner, 'KAMEEZ_SHALWAR')).toHaveLength(0);
  });

  it('refuses a hem narrower all the way round than the chest, naming the rule', () => {
    // Chest 1400 mm around (70 cm across) with a hem of 1000 mm (50 cm across).
    const narrow = checkSubmission(
      submission({
        kameezChest: { raw: '70', unit: 'CM' },
        kameezBottom: { raw: '50', unit: 'CM' },
      }),
    );
    expect(narrow.findings).toContainEqual(
      expect.objectContaining({
        pointId: 'kameezBottom',
        ruleId: 'hemAtLeastChest',
        reason: 'ORDER',
        relatedPoints: ['kameezChest'],
        direction: 'BELOW',
        expectedMm: 1400,
      }),
    );

    /* The rule this test is about, and only it: a 55 in chest beside an 18 in
       shoulder is a figure the soft rules have something to say about. */
    const wide = checkSubmission(
      submission({
        kameezChest: { raw: '70', unit: 'CM' },
        kameezBottom: { raw: '70', unit: 'CM' },
      }),
    );
    expect(wide.findings.some((found) => found.ruleId === 'hemAtLeastChest')).toBe(false);
  });

  it('asks for every required measurement', () => {
    const { findings } = checkSubmission(submission({ shalwarPaincha: null }));
    expect(findings).toContainEqual(
      expect.objectContaining({ pointId: 'shalwarPaincha', reason: 'REQUIRED' }),
    );
  });

  it('refuses a point the list does not have', () => {
    const extra = submission();
    extra.entries.push({ pointId: 'waistcoatChest', raw: '20', unit: 'IN' });
    expect(checkSubmission(extra).findings).toContainEqual(
      expect.objectContaining({ pointId: 'waistcoatChest', reason: 'UNKNOWN_POINT' }),
    );
  });

  it('refuses a list version that never existed, and saves nothing', () => {
    const owner = device('unknown-version');
    const outcome = saveProfile(owner, submission({}, { version: 99 }));
    expect(outcome).toEqual({
      kind: 'REJECTED',
      findings: [expect.objectContaining({ pointId: null, reason: 'SET_VERSION_UNKNOWN' })],
    });
    expect(profilesFor(owner, 'KAMEEZ_SHALWAR')).toHaveLength(0);
  });

  it('refuses a new save against a retired list, and derives from the current one', () => {
    const owner = device('retired-list');
    const stale = saveProfile(owner, submission(), WITH_V2);
    expect(stale).toEqual({
      kind: 'REJECTED',
      findings: [expect.objectContaining({ reason: 'SET_VERSION_SUPERSEDED' })],
    });

    // On v2 the chest is written FULL, so 42 in is in range and records 1067 mm.
    const current = saveProfile(
      owner,
      submission({ kameezChest: { raw: '42', unit: 'IN' } }, { version: 2 }),
      WITH_V2,
    );
    if (current.kind !== 'SAVED') throw new Error('expected a save on v2');
    expect(current.profile.setVersion).toBe(2);
    expect(current.profile.values.find((value) => value.pointId === 'kameezChest')?.valueMm).toBe(
      1067,
    );
  });
});

describe('every save is a new version (§34.7, D6)', () => {
  it('keeps both versions, and marks the first rather than replacing it', () => {
    const owner = device('two-saves');
    const first = saveProfile(owner, submission());
    const second = saveProfile(owner, submission({ kameezChest: { raw: '21.5', unit: 'IN' } }));
    if (first.kind !== 'SAVED' || second.kind !== 'SAVED') throw new Error('expected two saves');

    expect([first.profile.version, second.profile.version]).toEqual([1, 2]);
    expect(profilesFor(owner, 'KAMEEZ_SHALWAR').map((profile) => profile.supersededBy)).toEqual([
      second.profile.id,
      null,
    ]);
  });

  it('keeps what was typed beside what was recorded, and how it was taken', () => {
    const outcome = saveProfile(device('provenance'), submission());
    if (outcome.kind !== 'SAVED') throw new Error('expected a save');

    expect(outcome.profile.source).toBe('GARMENT_COPY');
    expect(outcome.profile.values.find((value) => value.pointId === 'kameezChest')).toEqual({
      pointId: 'kameezChest',
      enteredValue: '21',
      unitEntered: 'IN',
      enteredAs: 'HALF',
      basis: 'GARMENT',
      origin: 'TYPED',
      valueMm: 1067,
    });
  });
});

describe('the finishing choices (A2-7, A2-8)', () => {
  const plainSleeve = [{ group: 'sleeveFinish', value: 'PLAIN' }];

  it('refuses a cuff sent with a plain sleeve, and asks for nothing the choices do not', () => {
    const plain = submission({}, { preferences: plainSleeve });
    plain.entries.push({ pointId: 'kameezCuff', raw: '4.5', unit: 'IN' });
    expect(checkSubmission(plain).findings).toEqual([
      expect.objectContaining({ pointId: 'kameezCuff', reason: 'POINT_NOT_ASKED' }),
    ]);
  });

  it("refuses a ban's width sent with a collar, and a choice the list does not have", () => {
    const collar = checkSubmission(
      submission(
        {},
        {
          preferences: [
            { group: 'neckStyle', value: 'COLLAR' },
            { group: 'banWidth', value: 'WIDE' },
          ],
        },
      ),
    );
    expect(collar.findings).toEqual([
      expect.objectContaining({ pointId: null, reason: 'OPTION_NOT_APPLICABLE' }),
    ]);

    const pocket = checkSubmission(
      submission({}, { preferences: [{ group: 'pocket', value: 'PATCH' }] }),
    );
    expect(pocket.findings).toEqual([
      expect.objectContaining({ pointId: null, reason: 'OPTION_UNKNOWN' }),
    ]);
  });

  it('keeps the choices a profile was saved with, the defaults filled in', () => {
    const outcome = saveProfile(device('choices'), submission({}, { preferences: plainSleeve }));
    if (outcome.kind !== 'SAVED') throw new Error('expected a save');
    // No cuff style: with a plain sleeve there is no cuff to style.
    expect(outcome.profile.preferences).toEqual([
      { group: 'neckStyle', value: 'BAN' },
      { group: 'banWidth', value: 'NARROW' },
      { group: 'banShape', value: 'ROUND' },
      { group: 'sleeveFinish', value: 'PLAIN' },
    ]);
  });

  it('treats a choice sent twice as a malformed request', () => {
    const twice = [...plainSleeve, { group: 'sleeveFinish', value: 'CUFF' }];
    expect(isMalformed(submission({}, { preferences: twice }))).toBe(true);
    expect(isMalformed(submission())).toBe(false);
  });
});

describe('reading a saved profile back', () => {
  it('answers with the CURRENT version for each style, and none of the superseded ones', () => {
    const owner = device(issueDeviceToken());
    saveProfile(owner, submission());
    /* The LENGTH, because no tailor's rule is written against it: a second save
       that tripped a note would be refused, and this test is about versions. */
    saveProfile(owner, submission({ kameezLength: { raw: '42', unit: 'IN' } }));

    const current = currentProfilesFor(owner);
    expect(current).toHaveLength(1);
    expect(current[0]?.version).toBe(2);
    expect(current[0]?.values.find((value) => value.pointId === 'kameezLength')?.enteredValue).toBe(
      '42',
    );
  });

  it('keeps one current profile per style, side by side', () => {
    const owner = device(issueDeviceToken());
    saveProfile(owner, submission());
    // A kurta is one garment: sending a shalwar's figures to it would be refused.
    saveProfile(
      owner,
      submission({ shalwarLength: null, shalwarPaincha: null }, { garmentStyle: 'KURTA' }),
    );

    expect(
      currentProfilesFor(owner)
        .map((profile) => profile.garmentStyle)
        .sort(),
    ).toEqual(['KAMEEZ_SHALWAR', 'KURTA']);
  });

  it('answers for one owner only, and never tells them who they are', () => {
    const mine = device(issueDeviceToken());
    const theirs = device(issueDeviceToken());
    saveProfile(mine, submission());

    expect(currentProfilesFor(theirs)).toEqual([]);
    // The projection carries no owner key and no supersession bookkeeping.
    const profile = currentProfilesFor(mine)[0];
    expect(profile).toBeDefined();
    expect(profile).not.toHaveProperty('ownerKey');
    expect(profile).not.toHaveProperty('supersededBy');
  });
});

describe('the two ways of measuring are kept apart', () => {
  /* A card's points carry their own ids, so a card profile can only ever answer a
     card list. Superseding across the paths therefore did not replace one set of
     figures with another, it HID the first: the guest who copied a garment and
     then tried their tailor's card lost the garment figures from every page that
     could have offered them, including the waistcoat suit, which has no card list
     to switch to. */
  it('keeps a garment copy and a tailor card as two current profiles, not one', () => {
    const owner = device(issueDeviceToken());
    saveProfile(owner, submission());
    saveProfile(owner, cardSubmission());

    const current = currentProfilesFor(owner);
    expect(
      current
        .map((profile) => `${profile.garmentStyle}/${profile.source} v${profile.version}`)
        .sort(),
    ).toEqual(['KAMEEZ_SHALWAR/GARMENT_COPY v1', 'KAMEEZ_SHALWAR/TAILOR_CARD v1']);
  });

  it('counts versions per path, so a save on one never renumbers the other', () => {
    const owner = device(issueDeviceToken());
    saveProfile(owner, submission());
    saveProfile(owner, cardSubmission());
    saveProfile(owner, submission({ kameezLength: { raw: '42', unit: 'IN' } }));

    const current = currentProfilesFor(owner);
    const garment = current.find((profile) => profile.source === 'GARMENT_COPY');
    const card = current.find((profile) => profile.source === 'TAILOR_CARD');
    expect(garment?.version).toBe(2);
    expect(card?.version).toBe(1);
    // The first garment save is superseded; the card save is untouched by it.
    expect(current).toHaveLength(2);
  });
});

describe('who a profile belongs to', () => {
  it("never lets a device reach an account's profiles, whatever it calls itself", () => {
    const account: ProfileOwnerRow = { keptWith: 'ACCOUNT', key: 'someone@example.com' };
    saveProfile(account, submission());

    // A device whose key is the account's email is still a device.
    const impostor = saveProfile(device('someone@example.com'), submission());
    if (impostor.kind !== 'SAVED') throw new Error('expected a save');
    expect(impostor.profile.version).toBe(1);
    expect(profilesFor(account, 'KAMEEZ_SHALWAR').map((profile) => profile.supersededBy)).toEqual([
      null,
    ]);
  });

  it('counts a device only with a token the module issued', () => {
    expect(isKnownOwner({ keptWith: 'ACCOUNT', key: 'someone@example.com' })).toBe(true);
    expect(isKnownOwner(device('b1c2d3e4-0000-4c8a-8f21-000000000000'))).toBe(false);
    expect(isKnownOwner(device(issueDeviceToken()))).toBe(true);
  });

  it('reads the owner the BFF attached, and nothing else', () => {
    expect(profileOwnerOf('ACCOUNT:someone@example.com')).toEqual({
      keptWith: 'ACCOUNT',
      key: 'someone@example.com',
    });
    expect(profileOwnerOf('DEVICE:abc')).toEqual({ keptWith: 'DEVICE', key: 'abc' });
    expect(profileOwnerOf(null)).toBeNull();
    expect(profileOwnerOf('')).toBeNull();
    expect(profileOwnerOf('ACCOUNT:')).toBeNull();
    expect(profileOwnerOf('ADMIN:abc')).toBeNull();
  });
});
