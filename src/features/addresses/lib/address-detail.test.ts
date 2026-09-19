import { describe, expect, it } from 'vitest';

import { detailOf, holdsAddress } from './address-detail';

const home = {
  recipientName: 'Ali Raza',
  recipientMobile: '03001234567',
  line: 'House 12, Street 4, Gulberg',
  city: 'Lahore',
};

describe('an address as a form edits it', () => {
  it('keeps the four fields and drops the book’s own bookkeeping', () => {
    const saved = { ...home, id: 'a', savedAt: '2026-09-16T10:00:00.000Z', isDefault: true };

    expect(detailOf(saved)).toEqual(home);
  });

  it.each([
    ['the same address', home, true],
    ['another city', { ...home, city: 'Multan' }, false],
    ['another recipient at the same door', { ...home, recipientName: 'Sara Raza' }, false],
  ])('knows whether the book holds %s', (_label, address, expected) => {
    expect(holdsAddress([home], address)).toBe(expected);
  });
});
