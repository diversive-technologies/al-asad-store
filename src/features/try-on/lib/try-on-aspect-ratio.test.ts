import { describe, expect, it } from 'vitest';

import { aspectRatioFor } from './try-on-aspect-ratio';

/**
 * §24 — the try-on is generated in the shape of the customer's photograph, so a
 * phone portrait comes back a phone portrait rather than whatever shape the
 * model settled on and padded with blurred margins.
 */
describe('aspectRatioFor', () => {
  it.each([
    ['a square photograph', 1024, 1024, '1:1'],
    ['a 4:5 portrait, the catalogue’s own shape', 819, 1024, '4:5'],
    ['a 3:4 phone portrait', 768, 1024, '3:4'],
    ['a 9:16 phone portrait', 576, 1024, '9:16'],
    ['a 4:3 landscape', 1024, 768, '4:3'],
    ['a 16:9 landscape', 1024, 576, '16:9'],
    ['a panorama wider than any shape offered', 1024, 300, '21:9'],
    ['a strip taller than any shape offered', 300, 1024, '9:16'],
  ])('answers %s with the nearest shape it can produce', (_case, width, height, expected) => {
    expect(aspectRatioFor(width, height)).toBe(expected);
  });
});
