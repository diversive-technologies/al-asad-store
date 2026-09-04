import { describe, expect, it } from 'vitest';

import { shouldAttemptCodeLookup } from './product-code';

describe('shouldAttemptCodeLookup', () => {
  it('attempts a lookup for a single token', () => {
    expect(shouldAttemptCodeLookup('AA-1000')).toBe(true);
  });

  it('attempts a lookup for tokens that are not obviously codes', () => {
    // Deliberate: deciding what IS a code is the backend's rule (DATA-13). This
    // only filters out what cannot possibly be one.
    expect(shouldAttemptCodeLookup('lawn')).toBe(true);
    expect(shouldAttemptCodeLookup('12345')).toBe(true);
  });

  it('declines a multi-word phrase, which can never be one code', () => {
    expect(shouldAttemptCodeLookup('embroidered lawn')).toBe(false);
  });

  it('declines an empty or whitespace-only term', () => {
    expect(shouldAttemptCodeLookup('')).toBe(false);
    expect(shouldAttemptCodeLookup('   ')).toBe(false);
  });

  it('tolerates surrounding whitespace around a single token', () => {
    expect(shouldAttemptCodeLookup('  AA-1000  ')).toBe(true);
  });

  it('declines exotic whitespace a paste can carry', () => {
    // A non-breaking space is invisible in the box but still makes it a phrase.
    expect(shouldAttemptCodeLookup('AA 1000')).toBe(false);
  });

  it('declines a token longer than any plausible code', () => {
    expect(shouldAttemptCodeLookup('A'.repeat(33))).toBe(false);
    expect(shouldAttemptCodeLookup('A'.repeat(32))).toBe(true);
  });
});
