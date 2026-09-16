import { describe, expect, it } from 'vitest';

import { garmentStyleIdSchema } from '@/lib/domain/ids';

import { measurementProfileSchema, type MeasurementProfile } from '../schemas/profile.schema';
import { figureShownIn, savedChoices, savedOffer } from './saved-figures';
import { pointId, pointOf, servedSet } from './test-support';

/*
 * The offer, not the applying: everything here says what CAN be put back into a
 * list. Nothing in this module fills a field — the customer does, by pressing
 * the one button — because cloth is cut from these figures.
 */

interface SavedValue {
  readonly pointId: string;
  readonly enteredValue: string;
  readonly unitEntered?: 'IN' | 'CM';
}

let nextId = 0;

function profile(
  garmentStyle: string,
  values: readonly SavedValue[],
  extra: { readonly createdAt?: string; readonly preferences?: readonly unknown[] } = {},
): MeasurementProfile {
  nextId += 1;
  return measurementProfileSchema.parse({
    id: `00000000-0000-4000-8000-${String(nextId).padStart(12, '0')}`,
    garmentStyle,
    setVersion: 1,
    ruleSetVersion: 1,
    version: 1,
    source: 'GARMENT_COPY',
    preferences: extra.preferences ?? [],
    values: values.map((value) => ({
      pointId: value.pointId,
      enteredValue: value.enteredValue,
      unitEntered: value.unitEntered ?? 'IN',
      enteredAs: 'HALF',
      basis: 'GARMENT',
      origin: 'TYPED',
      valueMm: 1000,
    })),
    acknowledgedFindings: [],
    keptWith: 'DEVICE',
    createdAt: extra.createdAt ?? '2026-09-14T10:00:00.000Z',
  });
}

const PAIR = servedSet('KAMEEZ_SHALWAR');
const SUIT = servedSet('WAISTCOAT_SUIT');
const CARD = servedSet('KAMEEZ_SHALWAR', 'TAILOR_CARD');

const figureOn = (offer: ReturnType<typeof savedOffer>, pointId: string) =>
  offer?.figures.find((figure) => figure.pointId === pointId);

describe('what a saved profile can put back into a list', () => {
  it('offers this style’s own figures, and says none were borrowed', () => {
    const offer = savedOffer(PAIR, [
      profile('KAMEEZ_SHALWAR', [
        { pointId: 'kameezChest', enteredValue: '21' },
        { pointId: 'shalwarLength', enteredValue: '40' },
      ]),
    ]);

    expect(offer?.figures.map((figure) => figure.pointId)).toEqual([
      'kameezChest',
      'shalwarLength',
    ]);
    expect(offer?.borrowed).toBe(false);
    expect(offer?.setAside).toEqual([]);
  });

  it('answers with nothing when the customer has saved nothing', () => {
    expect(savedOffer(PAIR, [])).toBeNull();
  });
});

describe('reuse across garment styles', () => {
  /* The load-bearing property of the whole feature: the served lists are composed
     from the SAME point rows, so a measurement taken for one style is the same
     measurement in another. Eleven of a waistcoat suit's fourteen come free. */
  it('fills a waistcoat suit from a kameez shalwar, and marks the figures borrowed', () => {
    const offer = savedOffer(SUIT, [
      profile('KAMEEZ_SHALWAR', [
        { pointId: 'kameezChest', enteredValue: '21' },
        { pointId: 'shalwarLength', enteredValue: '40' },
      ]),
    ]);

    expect(offer?.figures.map((figure) => figure.pointId)).toEqual([
      'kameezChest',
      'shalwarLength',
    ]);
    expect(offer?.borrowed).toBe(true);
    expect(figureOn(offer, 'kameezChest')?.fromStyle).toBe('KAMEEZ_SHALWAR');
  });

  it('leaves out a figure for a garment this list does not measure, and does not report it', () => {
    const offer = savedOffer(PAIR, [
      profile('WAISTCOAT_SUIT', [
        { pointId: 'kameezChest', enteredValue: '21' },
        { pointId: 'waistcoatChest', enteredValue: '20' },
      ]),
    ]);

    expect(offer?.figures.map((figure) => figure.pointId)).toEqual(['kameezChest']);
    // Not a problem the customer can act on: they are not measuring a waistcoat.
    expect(offer?.setAside).toEqual([]);
  });

  it('takes nothing off a garment profile onto a tailor’s-card list', () => {
    // A card's points carry their own ids, so a card figure is never a garment one.
    expect(
      savedOffer(CARD, [
        profile('KAMEEZ_SHALWAR', [{ pointId: 'kameezChest', enteredValue: '21' }]),
      ]),
    ).toBeNull();
  });
});

describe('which profile answers for a measurement two of them hold', () => {
  it('prefers this list’s own style', () => {
    const offer = savedOffer(PAIR, [
      profile('WAISTCOAT_SUIT', [{ pointId: 'kameezChest', enteredValue: '25' }]),
      profile('KAMEEZ_SHALWAR', [{ pointId: 'kameezChest', enteredValue: '21' }]),
    ]);

    expect(figureOn(offer, 'kameezChest')?.raw).toBe('21');
    expect(offer?.lead.garmentStyle).toBe('KAMEEZ_SHALWAR');
  });

  it('otherwise prefers the most recent — the customer’s latest word on it', () => {
    const offer = savedOffer(PAIR, [
      profile('KURTA', [{ pointId: 'kameezChest', enteredValue: '19' }], {
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
      profile('WAISTCOAT_SUIT', [{ pointId: 'kameezChest', enteredValue: '25' }], {
        createdAt: '2026-09-01T00:00:00.000Z',
      }),
    ]);

    expect(figureOn(offer, 'kameezChest')?.raw).toBe('25');
  });
});

describe('a figure the list can no longer take', () => {
  it('sets it aside by name rather than filling it or dropping it silently', () => {
    // Stands for a range narrowed since the figure was saved.
    const offer = savedOffer(PAIR, [
      profile('KAMEEZ_SHALWAR', [
        { pointId: 'kameezChest', enteredValue: '5' },
        { pointId: 'shalwarLength', enteredValue: '40' },
      ]),
    ]);

    expect(offer?.setAside).toEqual([{ pointId: 'kameezChest', reason: 'OUT_OF_RANGE' }]);
    expect(figureOn(offer, 'kameezChest')).toBeUndefined();
    expect(figureOn(offer, 'shalwarLength')?.raw).toBe('40');
  });

  it('does not let an older profile quietly answer in its place', () => {
    const offer = savedOffer(PAIR, [
      profile('KAMEEZ_SHALWAR', [{ pointId: 'kameezChest', enteredValue: '5' }], {
        createdAt: '2026-09-10T00:00:00.000Z',
      }),
      profile('KAMEEZ_SHALWAR', [{ pointId: 'kameezChest', enteredValue: '21' }], {
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    ]);

    expect(figureOn(offer, 'kameezChest')).toBeUndefined();
    expect(offer?.setAside).toEqual([{ pointId: 'kameezChest', reason: 'OUT_OF_RANGE' }]);
  });
});

describe('the finishing choices that come back with the figures', () => {
  it('keeps a choice the list still offers and drops one it does not', () => {
    const saved = profile('KAMEEZ_SHALWAR', [{ pointId: 'kameezChest', enteredValue: '21' }], {
      preferences: [
        { group: 'neckStyle', value: 'COLLAR' },
        { group: 'neckStyle_gone', value: 'COLLAR' },
        { group: 'sleeveFinish', value: 'NOT_A_VALUE' },
      ],
    });

    expect(savedChoices(PAIR.options, saved)).toEqual([{ group: 'neckStyle', value: 'COLLAR' }]);
  });
});

describe('showing a saved figure in the unit the form is set to', () => {
  it('converts it, and holds a figure on a limit at that limit', () => {
    const neck = pointOf('kameezNeck');
    /* Through the real parsers, because an id is BRANDED: a bare string here
       would test a shape the studio never hands this function. */
    const saved = {
      pointId: pointId('kameezNeck'),
      raw: '33',
      unit: 'CM',
      fromStyle: garmentStyleIdSchema.parse('KAMEEZ_SHALWAR'),
    } as const;

    // 33 cm is 12.992 in, which would round to 12.99 beside a 13 in minimum.
    expect(figureShownIn(saved, neck, 'IN')).toBe('13');
    expect(figureShownIn(saved, neck, 'CM')).toBe('33');
  });
});
