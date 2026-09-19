import { describe, expect, it } from 'vitest';

import { optionGroupIdSchema, optionValueIdSchema } from '@/lib/domain/ids';
import { styleOffersSchema } from '@/lib/domain/style-offer';
import { measurementCopyFor } from '@/lib/mocks/measurement-copy-db';

import { measurementCopySchema } from '../schemas/measurement-copy.schema';
import { buildMeasurementSchema } from '../schemas/measurement.schema';
import { emptyEntry } from './entries';
import { optionConditionSchema } from '../schemas/measurement-set.schema';
import { detailOf, DRAWINGS } from './garment-drawings';
import { KAMEEZ_VARIANTS, kameezVaried } from './kameez-variants';
import { measuringOrder, requiredIds, stepFrom } from './measurement-set';
import {
  askedStudio,
  choicesInPlay,
  drawingVariants,
  neverTogether,
  preferencesOf,
  type Picks,
} from './options';
import { joinCopy, type StudioSet } from './studio-set';
import { pointId, pointOf, servedSet } from './test-support';
import { NOTHING_HELD, typedEntriesOf } from './unit-switch';

const joined = joinCopy(
  servedSet('KAMEEZ_SHALWAR'),
  styleOffersSchema.parse([
    { garmentStyle: 'KAMEEZ_SHALWAR', leadTimeDays: 7, stitchingChargeMinor: 250000 },
  ]),
  measurementCopySchema.parse(measurementCopyFor('en')),
);
if (!joined.ok) throw new Error(`missing: ${joined.error.join(', ')}`);
const STUDIO = joined.value.studio;
const KAMEEZ = STUDIO.pieces[0].id;

const picksOf = (picks: Readonly<Record<string, string>>): Picks =>
  new Map(
    Object.entries(picks).map(([group, value]) => [
      optionGroupIdSchema.parse(group),
      optionValueIdSchema.parse(value),
    ]),
  );
const inPlay = (picks: Readonly<Record<string, string>> = {}) =>
  choicesInPlay(STUDIO.options, picksOf(picks));
const asked = (picks: Readonly<Record<string, string>> = {}) => askedStudio(STUDIO, inPlay(picks));
const idsOf = (studio: StudioSet) => studio.points.map((point) => point.id);

describe('the choices in play', () => {
  it("starts every choice at its default, and offers the ban's width and ends with a ban", () => {
    expect(inPlay().map(({ group, value }) => [group.id, value.id])).toEqual([
      ['neckStyle', 'BAN'],
      ['banWidth', 'NARROW'],
      ['banShape', 'ROUND'],
      ['sleeveFinish', 'CUFF'],
      ['cuffStyle', 'SINGLE'],
    ]);
  });

  it("drops a choice whose condition does not hold — a ban's width with a collar", () => {
    const collar = inPlay({ neckStyle: 'COLLAR', banWidth: 'WIDE' });
    expect(collar.map((choice) => choice.group.id)).toEqual([
      'neckStyle',
      'sleeveFinish',
      'cuffStyle',
    ]);
  });

  it('takes a pick that is not one of the values as the default', () => {
    const rolled = inPlay({ sleeveFinish: 'ROLLED' });
    expect(rolled.find((choice) => choice.group.id === 'sleeveFinish')?.value.id).toBe('CUFF');
  });

  it('sends every choice in play, defaults included', () => {
    expect(preferencesOf(inPlay({ neckStyle: 'COLLAR' }))).toEqual([
      { group: 'neckStyle', value: 'COLLAR' },
      { group: 'sleeveFinish', value: 'CUFF' },
      { group: 'cuffStyle', value: 'SINGLE' },
    ]);
  });
});

describe('what the choices ask for', () => {
  it('asks for the cuff only with a cuff, and the sleeve opening only with a plain sleeve', () => {
    expect(idsOf(asked())).toContain('kameezCuff');
    expect(idsOf(asked())).not.toContain('kameezMohri');

    const plain = idsOf(asked({ sleeveFinish: 'PLAIN' }));
    expect(plain).toContain('kameezMohri');
    expect(plain).not.toContain('kameezCuff');
  });

  it("steps from the hem to a plain sleeve's opening, then on into the shalwar", () => {
    const order = measuringOrder(asked({ sleeveFinish: 'PLAIN' }).points);
    expect(stepFrom(order, pointId('kameezBottom'), 1)).toBe('kameezMohri');
    expect(stepFrom(order, pointId('kameezMohri'), 1)).toBe('shalwarLength');
    expect(stepFrom(order, pointId('kameezCuff'), 1)).toBeNull();
  });

  it('asks for the neck with a collar as with a ban, since a collar is sized by the neck too', () => {
    expect(idsOf(asked({ neckStyle: 'COLLAR' }))).toContain('kameezNeck');
  });

  it("keeps the client's eight required whatever the sleeve", () => {
    expect(requiredIds(asked({ sleeveFinish: 'PLAIN' }).points)).toEqual(
      requiredIds(asked().points),
    );
  });

  it('lets a kept out-of-range cuff through once the sleeve is plain', () => {
    // The form judges only what is asked; the cuff's 99 is kept, unjudged. Every
    // other field holds '' as an input does.
    const figures = {
      ...emptyEntry(STUDIO.points),
      kameezLength: '40',
      kameezSleeve: '24',
      kameezShoulder: '18',
      kameezNeck: '15.5',
      kameezChest: '21',
      kameezBottom: '22',
      shalwarLength: '40',
      shalwarPaincha: '7.5',
      kameezCuff: '99',
    };
    const plain = buildMeasurementSchema(asked({ sleeveFinish: 'PLAIN' }).points, 'IN');
    const cuffed = buildMeasurementSchema(asked().points, 'IN');
    expect(plain.safeParse(figures).success).toBe(true);
    expect(cuffed.safeParse(figures).success).toBe(false);
  });

  it('never sends a figure kept on a point that is no longer asked', () => {
    const plain = asked({ sleeveFinish: 'PLAIN' });
    const values = { kameezCuff: '4', kameezMohri: '7' };
    expect(typedEntriesOf(plain.points, values, NOTHING_HELD, 'IN')).toEqual([
      { pointId: 'kameezMohri', raw: '7', unit: 'IN' },
    ]);
  });

  it("lets a cuff and a plain sleeve's opening share a place, and no pair asked together", () => {
    const groups = STUDIO.options;
    expect(neverTogether(pointOf('kameezCuff'), pointOf('kameezMohri'), groups)).toBe(true);
    expect(neverTogether(pointOf('kameezCuff'), pointOf('kameezChest'), groups)).toBe(false);
  });

  it('sees a clash one choice further up — a double cuff against a plain sleeve', () => {
    // A double cuff's own condition names the cuff style, not the sleeve end; the
    // cuff style only applies with a cuff, so it can never meet the plain opening.
    const doubleCuffDepth = { askedWhen: { group: 'cuffStyle', values: ['DOUBLE'] } };
    const parsed = optionConditionSchema.parse(doubleCuffDepth.askedWhen);
    expect(neverTogether({ askedWhen: parsed }, pointOf('kameezMohri'), STUDIO.options)).toBe(true);
    expect(neverTogether({ askedWhen: parsed }, pointOf('kameezCuff'), STUDIO.options)).toBe(false);
  });
});

describe('how the choices draw the kameez', () => {
  const kameez = DRAWINGS.KAMEEZ;
  const NARROW_ROUND_BAN = 'M84,29 L85,21 C90,18 96,17 100,17 L100,31';
  const SINGLE_CUFF_SEAM = 'M33,136 L50,146';

  it('draws the kameez the studio has always drawn when nothing is chosen', () => {
    expect(detailOf(kameez)).toContain(NARROW_ROUND_BAN);
    expect(detailOf(kameez)).toContain(SINGLE_CUFF_SEAM);
    expect(detailOf(kameez, drawingVariants(inPlay(), KAMEEZ))).toEqual(detailOf(kameez));
  });

  it('draws a collar for a collar, and a turned hem for a plain sleeve', () => {
    const variants = drawingVariants(
      inPlay({ neckStyle: 'COLLAR', sleeveFinish: 'PLAIN' }),
      KAMEEZ,
    );
    expect(variants).toEqual(new Set(['COLLAR', 'SLEEVE_PLAIN']));

    const detail = detailOf(kameez, variants);
    expect(detail).not.toContain(NARROW_ROUND_BAN);
    expect(detail).not.toContain(SINGLE_CUFF_SEAM);
  });

  it('draws a whole garment for a variant it does not know', () => {
    expect(detailOf(kameez, new Set(['EMBROIDERED']))).toEqual(detailOf(kameez));
  });

  it.each([...KAMEEZ_VARIANTS])('draws %s differently from the default', (variant) => {
    // A name the drawing silently ignored would draw the default and pass every
    // other test here.
    expect(kameezVaried(new Set([variant]))).not.toEqual(kameezVaried(new Set()));
  });

  it.each([...KAMEEZ_VARIANTS])('draws the %s variant inside the kameez', (variant) => {
    for (const stroke of kameezVaried(new Set([variant]))) {
      const numbers = [...stroke.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
      for (let at = 0; at < numbers.length; at += 2) {
        const [x = -1, y = -1] = numbers.slice(at, at + 2);
        expect(x, stroke).toBeGreaterThanOrEqual(0);
        expect(x, stroke).toBeLessThanOrEqual(kameez.width);
        expect(y, stroke).toBeGreaterThanOrEqual(0);
        expect(y, stroke).toBeLessThanOrEqual(kameez.height);
      }
    }
  });
});
