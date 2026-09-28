import { describe, expect, it } from 'vitest';

import { MAX_CHANNEL_GAIN, whiteBalanceGains } from './try-on-white-balance';

/**
 * §24 — the bound on the white-balance correction. The means below are the
 * store's own photographs, measured with sharp: a neutral one that should be
 * left alone, and the rust kurta whose unbounded correction was a 0.70 red and
 * 1.64 blue gain that turned skin grey-blue.
 */
describe('whiteBalanceGains', () => {
  it('moves a photograph that is already neutral by almost nothing', () => {
    const [red, green, blue] = whiteBalanceGains({ red: 192, green: 187, blue: 188 });

    expect(red).toBeCloseTo(1, 1);
    expect(green).toBeCloseTo(1, 1);
    expect(blue).toBeCloseTo(1, 1);
  });

  it('corrects a mild cast in full, because it is inside the bound', () => {
    const [red, , blue] = whiteBalanceGains({ red: 182, green: 168, blue: 154 });

    expect(red).toBeCloseTo(168 / 182, 5);
    expect(blue).toBeCloseTo(168 / 154, 5);
  });

  it('nudges rather than repaints a photograph that is full of one colour', () => {
    const [red, green, blue] = whiteBalanceGains({ red: 135, green: 90, blue: 57 });

    expect(red).toBe(1 / MAX_CHANNEL_GAIN);
    expect(green).toBeCloseTo(94 / 90, 5);
    expect(blue).toBe(MAX_CHANNEL_GAIN);
  });

  it.each([
    ['red', { red: 0, green: 120, blue: 120 }, 0],
    ['green', { red: 120, green: 0, blue: 120 }, 1],
    ['blue', { red: 120, green: 120, blue: 0 }, 2],
  ] as const)(
    'leaves a fully black %s channel alone rather than divide by zero',
    (_name, means, index) => {
      expect(whiteBalanceGains(means)[index]).toBe(1);
    },
  );
});
