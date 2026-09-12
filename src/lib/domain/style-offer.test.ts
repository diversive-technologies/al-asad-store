import { describe, expect, it } from 'vitest';

import { styleOffersSchema } from './style-offer';

describe('the style offers', () => {
  it('accepts a list of distinct styles', () => {
    expect(
      styleOffersSchema.safeParse([
        { garmentStyle: 'KAMEEZ_SHALWAR', leadTimeDays: 7 },
        { garmentStyle: 'KURTA', leadTimeDays: 5 },
      ]).success,
    ).toBe(true);
  });

  it('refuses a style offered twice, which would draw two choices with one key', () => {
    expect(
      styleOffersSchema.safeParse([
        { garmentStyle: 'KURTA', leadTimeDays: 5 },
        { garmentStyle: 'KURTA', leadTimeDays: 6 },
      ]).success,
    ).toBe(false);
  });

  it('refuses an empty list, since a bare /stitched opens the first offer', () => {
    expect(styleOffersSchema.safeParse([]).success).toBe(false);
  });
});
