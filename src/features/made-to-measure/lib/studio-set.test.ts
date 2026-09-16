import { describe, expect, it } from 'vitest';

import { styleOffersSchema } from '@/lib/domain/style-offer';
import { measurementCopyFor } from '@/lib/mocks/measurement-copy-db';

import { measurementCopySchema, type MeasurementCopy } from '../schemas/measurement-copy.schema';
import { requestedSource, requestedStyle } from './studio-params';
import { joinCopy } from './studio-set';
import { servedSet } from './test-support';

const PAIR = servedSet('KAMEEZ_SHALWAR');
const OFFERS = styleOffersSchema.parse([
  { garmentStyle: 'KAMEEZ_SHALWAR', leadTimeDays: 7, stitchingChargeMinor: 250000 },
]);
const COPY = measurementCopySchema.parse(measurementCopyFor('en'));

describe('joining the list to its words', () => {
  it('gives every garment and point its words, in the served order', () => {
    const joined = joinCopy(PAIR, OFFERS, COPY);
    if (!joined.ok) throw new Error(`missing: ${joined.error.join(', ')}`);

    expect(joined.value.studio.pieces.map((piece) => piece.label)).toEqual(['Kameez', 'Shalwar']);
    expect(joined.value.studio.points[0]).toMatchObject({
      id: 'kameezLength',
      label: 'Kameez length',
    });
    expect(joined.value.styles).toEqual([
      {
        garmentStyle: 'KAMEEZ_SHALWAR',
        leadTimeDays: 7,
        stitchingChargeMinor: 250000,
        label: 'Kameez shalwar',
      },
    ]);
  });

  it('names every garment or point that has no words, rather than drawing a field with no name', () => {
    const gappy: MeasurementCopy = {
      ...COPY,
      pieces: { KAMEEZ: 'Kameez' },
      points: Object.fromEntries(
        Object.entries(COPY.points).filter(([id]) => id !== 'kameezChest'),
      ),
    };

    const joined = joinCopy(PAIR, OFFERS, gappy);
    expect(joined.ok ? [] : joined.error).toEqual(['SHALWAR', 'kameezChest']);
  });

  it('names a finishing choice, or one of its values, that has no words', () => {
    const gappy: MeasurementCopy = {
      ...COPY,
      options: {
        ...Object.fromEntries(Object.entries(COPY.options).filter(([id]) => id !== 'cuffStyle')),
        neckStyle: { label: 'Neck style', values: { BAN: 'Ban' } },
      },
    };

    const joined = joinCopy(PAIR, OFFERS, gappy);
    expect(joined.ok ? [] : joined.error).toEqual(['neckStyle.COLLAR', 'cuffStyle']);
  });

  it('leaves out a style with no name, and says so, without taking the list down', () => {
    const offers = styleOffersSchema.parse([
      { garmentStyle: 'KAMEEZ_SHALWAR', leadTimeDays: 7, stitchingChargeMinor: 250000 },
      { garmentStyle: 'SHERWANI', leadTimeDays: 14, stitchingChargeMinor: 250000 },
    ]);

    const joined = joinCopy(PAIR, offers, COPY);
    if (!joined.ok) throw new Error(`missing: ${joined.error.join(', ')}`);
    expect(joined.value.styles.map((style) => style.garmentStyle)).toEqual(['KAMEEZ_SHALWAR']);
    expect(joined.value.unlabelledStyles).toEqual(['SHERWANI']);
  });
});

describe('what a /stitched address asks for', () => {
  it('reads a style code', () => {
    expect(requestedStyle('WAISTCOAT_SUIT')).toBe('WAISTCOAT_SUIT');
  });

  it('reads a way of measuring, and nothing that is not one', () => {
    expect(requestedSource('TAILOR_CARD')).toBe('TAILOR_CARD');
    expect(requestedSource(undefined)).toBeNull();
    expect(requestedSource('BODY')).toBeNull();
    expect(requestedSource(['TAILOR_CARD', 'GARMENT_COPY'])).toBeNull();
  });

  it('asks for nothing when the address is bare, repeated or malformed', () => {
    expect(requestedStyle(undefined)).toBeNull();
    expect(requestedStyle(['KAMEEZ_SHALWAR', 'WAISTCOAT_SUIT'])).toBeNull();
    expect(requestedStyle('')).toBeNull();
    expect(requestedStyle('kameez shalwar')).toBeNull();
    expect(requestedStyle('../admin')).toBeNull();
  });
});
