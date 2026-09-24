import { describe, expect, it } from 'vitest';

import {
  ACCEPTED_FORMATS,
  MAX_EDGE_PX,
  MAX_PHOTO_BYTES,
  PROVIDER_TIMEOUT_MS,
  refusesPhoto,
} from './try-on-limits';
import { TRY_ON_REQUEST_TIMEOUT_MS } from '@/config/constants';

/**
 * §24 — the module's own rules, and the two relationships between them that are
 * easy to break by editing one number.
 */
describe('what the module will take', () => {
  it.each([
    ['nothing at all', 0, 'image/jpeg'],
    ['a photograph past the ceiling', MAX_PHOTO_BYTES + 1, 'image/jpeg'],
    ['a format it never offered', 1_000, 'image/gif'],
    // The catalogue is stored in AVIF; the model does not take it (see the file).
    ['the format the catalogue itself uses', 1_000, 'image/avif'],
  ])('refuses %s', (_case, bytes, mime) => {
    expect(refusesPhoto(bytes, mime)).toBe(true);
  });

  it.each(ACCEPTED_FORMATS)('takes %s at a workable size', (mime) => {
    expect(refusesPhoto(1_000, mime)).toBe(false);
    expect(refusesPhoto(MAX_PHOTO_BYTES, mime)).toBe(false);
  });
});

describe('the two numbers that have to stay in order', () => {
  /*
   * The module's timeout must fire FIRST, so the customer is told the
   * generation took too long rather than seeing a generic transport abort from
   * the frontend's own budget. Raising one without the other silently swaps
   * which message they get.
   */
  it('gives up on the model before the frontend gives up on the module', () => {
    expect(PROVIDER_TIMEOUT_MS).toBeLessThan(TRY_ON_REQUEST_TIMEOUT_MS);
  });

  it('sends an image small enough to be worth the latency', () => {
    expect(MAX_EDGE_PX).toBeLessThanOrEqual(1536);
  });
});
