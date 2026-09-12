import { describe, expect, it } from 'vitest';

import { LOCALES } from '@/i18n/locales';
import { styleOffersSchema } from '@/lib/domain/style-offer';
import { measurementCopyFor } from '@/lib/mocks/measurement-copy-db';
import { measurementSetFor, STYLE_OFFERS } from '@/lib/mocks/measurement-sets-db';
import {
  checkSubmission,
  saveProfile,
  type SubmissionRow,
  type TypedEntryRow,
} from '@/lib/mocks/profiles-db';

import { measurementCopySchema } from '../schemas/measurement-copy.schema';
import type { MeasurementSet } from '../schemas/measurement-set.schema';
import { readingOf } from './garments';
import { sanitizeMarks } from './marks';
import { joinCopy } from './studio-set';
import { servedSet } from './test-support';

const CARD = servedSet('KAMEEZ_SHALWAR', 'TAILOR_CARD');
const GARMENT = servedSet('KAMEEZ_SHALWAR');

const pointIn = (set: MeasurementSet, id: string) => {
  const point = set.points.find((candidate) => candidate.id === id);
  if (point === undefined) throw new Error(`no point ${id}`);
  return point;
};

const inches = (pointId: string, raw: string): TypedEntryRow => ({ pointId, raw, unit: 'IN' });

/* The client's own example — chest 19.5, ghera 20.5, teera 8.5, cuff 8.5 — with
   the rest of a plausible card around it. */
const CARD_SUBMISSION: SubmissionRow = {
  garmentStyle: 'KAMEEZ_SHALWAR',
  source: 'TAILOR_CARD',
  version: 1,
  entries: [
    inches('kameezCardLength', '40'),
    inches('kameezCardSleeve', '24'),
    inches('kameezCardTeera', '8.5'),
    inches('kameezCardNeck', '15.5'),
    inches('kameezCardChest', '19.5'),
    inches('kameezCardGhera', '20.5'),
    inches('kameezCardCuff', '8.5'),
    inches('shalwarCardLength', '40'),
    inches('shalwarCardPoncha', '7.5'),
  ],
  preferences: [],
  acknowledgedFindings: [],
};

describe("the tailor's card path (plan Phase 4)", () => {
  it('is its own list, with its own ids, beside the garment path', () => {
    expect(CARD.source).toBe('TAILOR_CARD');
    expect(CARD.sources).toEqual(['GARMENT_COPY', 'TAILOR_CARD']);
    const garmentIds = new Set<string>(GARMENT.points.map((point) => point.id));
    for (const point of CARD.points) expect(garmentIds.has(point.id), point.id).toBe(false);
  });

  it('asks for what a card holds: its finishing choices describe the kameez, and ask for nothing', () => {
    expect(CARD.options.map((group) => group.id)).toEqual(GARMENT.options.map((group) => group.id));
    for (const point of CARD.points) expect(point.askedWhen, point.id).toBeNull();
  });

  it('holds a card to the same rule as a garment: a ghera narrower than the chest', () => {
    const figures: Readonly<Record<string, string>> = { kameezCardChest: '21', kameezCardGhera: '19' };
    const narrow = checkSubmission({
      ...CARD_SUBMISSION,
      entries: CARD_SUBMISSION.entries.map((entry) => ({
        ...entry,
        raw: figures[entry.pointId] ?? entry.raw,
      })),
    });
    expect(narrow.findings).toContainEqual(
      expect.objectContaining({ pointId: 'kameezCardGhera', ruleId: 'hemAtLeastChest', reason: 'ORDER' }),
    );
  });

  it("reads a card's teera as half the shoulder", () => {
    expect(readingOf(pointIn(CARD, 'kameezCardTeera'))).toBe('HALF_WIDTH');
  });

  it("takes the client's own example off a card, and refuses it as a garment's figures", () => {
    const onCard = checkSubmission(CARD_SUBMISSION);
    expect(onCard.findings).toEqual([]);
    expect(onCard.recorded).toEqual(
      expect.arrayContaining([
        { pointId: 'kameezCardChest', valueMm: 991 },
        { pointId: 'kameezCardGhera', valueMm: 1041 },
        { pointId: 'kameezCardTeera', valueMm: 432 },
        { pointId: 'kameezCardCuff', valueMm: 216 },
      ]),
    );

    // The same figures typed into a garment's fields: a shoulder of 8.5 in whole
    // and a cuff of 8.5 in across are not garments anyone owns.
    const renamed: Record<string, string> = {
      kameezCardLength: 'kameezLength',
      kameezCardSleeve: 'kameezSleeve',
      kameezCardTeera: 'kameezShoulder',
      kameezCardNeck: 'kameezNeck',
      kameezCardChest: 'kameezChest',
      kameezCardGhera: 'kameezBottom',
      kameezCardCuff: 'kameezCuff',
      shalwarCardLength: 'shalwarLength',
      shalwarCardPoncha: 'shalwarPaincha',
    };
    const onGarment = checkSubmission({
      ...CARD_SUBMISSION,
      source: 'GARMENT_COPY',
      entries: CARD_SUBMISSION.entries.map((entry) => ({
        ...entry,
        pointId: renamed[entry.pointId] ?? entry.pointId,
      })),
    });
    const refused = onGarment.findings.filter((finding) => finding.reason === 'OUT_OF_RANGE');
    expect(new Set(refused.map((finding) => finding.pointId))).toEqual(
      new Set(['kameezShoulder', 'kameezCuff']),
    );
  });

  it("asks about a card's teera that does not suit the chest beside it, with no figure to copy", () => {
    // 7.5 on the card is a 381 mm shoulder where its 19.5 chest expects 432.
    const narrow = checkSubmission({
      ...CARD_SUBMISSION,
      entries: CARD_SUBMISSION.entries.map((entry) =>
        entry.pointId === 'kameezCardTeera' ? { ...entry, raw: '7.5' } : entry,
      ),
    });
    expect(narrow.findings).toEqual([
      expect.objectContaining({
        pointId: 'kameezCardTeera',
        severity: 'CONFIRM',
        reason: 'DEVIATION',
        relatedPoints: ['kameezCardChest'],
        direction: 'BELOW',
        // Nothing to copy: the customer measures again, or keeps the card's figure.
        expectedMm: null,
      }),
    ]);
  });

  it("keeps a card save as the card's, read off the list — never the page's word", () => {
    const outcome = saveProfile({ keptWith: 'DEVICE', key: 'card-path' }, CARD_SUBMISSION);
    if (outcome.kind !== 'SAVED') throw new Error('expected a save');
    expect(outcome.profile.source).toBe('TAILOR_CARD');
    // Copied off a card, not typed off a tape (A2-8).
    for (const value of outcome.profile.values) expect(value.origin, value.pointId).toBe('TRANSCRIBED');

    // Card figures sent against the garment list are points that list does not have.
    const crossed = checkSubmission({ ...CARD_SUBMISSION, source: 'GARMENT_COPY' });
    expect(crossed.findings).toContainEqual(
      expect.objectContaining({ pointId: 'kameezCardChest', reason: 'UNKNOWN_POINT' }),
    );
  });

  it('serves no card path for a waistcoat suit yet', () => {
    expect(servedSet('WAISTCOAT_SUIT').sources).toEqual(['GARMENT_COPY']);
    expect(measurementSetFor('WAISTCOAT_SUIT', undefined, 'TAILOR_CARD')).toBeNull();
  });

  it.each([...LOCALES])('words, draws and bounds every card list in %s', (locale) => {
    const copy = measurementCopySchema.parse(measurementCopyFor(locale));
    const offers = styleOffersSchema.parse(STYLE_OFFERS);
    for (const style of ['KAMEEZ_SHALWAR', 'KURTA']) {
      const set = servedSet(style, 'TAILOR_CARD');
      const joined = joinCopy(set, offers, copy);
      expect(joined.ok ? [] : joined.error, `${locale} ${style}`).toEqual([]);
      expect(sanitizeMarks(set).dropped, style).toEqual([]);
      for (const point of set.points.filter((candidate) => candidate.enteredAs === 'HALF')) {
        expect(point.maxMm, point.id).toBeLessThan(2 * point.minMm);
      }
    }
  });
});
