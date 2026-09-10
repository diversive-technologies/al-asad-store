import { describe, expect, it } from 'vitest';

import { takenIds } from './entries';

describe('what counts as measured', () => {
  it('accepts a figure inside the bounds', () => {
    // kameezShoulder is a SPAN of 350–600 mm, so 13.8–23.6 in.
    expect(takenIds({ kameezShoulder: '18' }, 'IN').has('kameezShoulder')).toBe(true);
  });

  it('halves a ring bound back, because the field holds the across figure', () => {
    // kameezChest is a RING of 800–1500 mm around, so the field takes 15.7–29.5 in.
    expect(takenIds({ kameezChest: '21' }, 'IN').has('kameezChest')).toBe(true);
    // 42 would be a valid circumference and is nonsense as a measurement across.
    expect(takenIds({ kameezChest: '42' }, 'IN').has('kameezChest')).toBe(false);
  });

  it('does not count an out-of-range figure', () => {
    // Otherwise the mark lights up and the counter ticks, and then the submit
    // fails on the same field — three surfaces disagreeing at once.
    expect(takenIds({ kameezShoulder: '90' }, 'IN').has('kameezShoulder')).toBe(false);
  });

  it('does not count an empty or blank field', () => {
    expect(takenIds({}, 'IN').size).toBe(0);
    expect(takenIds({ kameezShoulder: '' }, 'IN').size).toBe(0);
    expect(takenIds({ kameezShoulder: '   ' }, 'IN').size).toBe(0);
  });

  it('does not count something that is not a number', () => {
    expect(takenIds({ kameezShoulder: 'eighteen' }, 'IN').size).toBe(0);
  });

  it('judges the same measurement identically in either unit', () => {
    // 18 in is 457 mm is 46 cm. The record does not change when the toggle does.
    expect(takenIds({ kameezShoulder: '18' }, 'IN').has('kameezShoulder')).toBe(true);
    expect(takenIds({ kameezShoulder: '46' }, 'CM').has('kameezShoulder')).toBe(true);
  });
});
