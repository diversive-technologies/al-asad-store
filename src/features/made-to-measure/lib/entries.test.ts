import { describe, expect, it } from 'vitest';

import { requiredTaken, takenIds } from './entries';
import { EVERY_POINT, pointId } from './test-support';
import type { Unit } from './units';

const taken = (entries: Readonly<Record<string, string>>, unit: Unit = 'IN') =>
  takenIds(EVERY_POINT, entries, unit);

describe('what counts as measured', () => {
  it('accepts a figure inside the bounds', () => {
    // kameezShoulder is read whole across 350–600 mm, so 13.78–23.62 in.
    expect(taken({ kameezShoulder: '18' }).has(pointId('kameezShoulder'))).toBe(true);
  });

  it('halves a half figure’s bound back, because the field holds the across reading', () => {
    // kameezChest is 800–1500 mm around, so the field takes 15.75–29.52 in.
    expect(taken({ kameezChest: '21' }).has(pointId('kameezChest'))).toBe(true);
    // 42 would be a valid circumference and is nonsense as a measurement across.
    expect(taken({ kameezChest: '42' }).has(pointId('kameezChest'))).toBe(false);
  });

  it('does not count an out-of-range figure', () => {
    // Otherwise the mark lights up and the counter ticks, and then the submit
    // fails on the same field — three surfaces disagreeing at once.
    expect(taken({ kameezShoulder: '90' }).has(pointId('kameezShoulder'))).toBe(false);
  });

  it('does not count an empty or blank field', () => {
    expect(taken({}).size).toBe(0);
    expect(taken({ kameezShoulder: '' }).size).toBe(0);
    expect(taken({ kameezShoulder: '   ' }).size).toBe(0);
  });

  it('does not count something that is not a number', () => {
    expect(taken({ kameezShoulder: 'eighteen' }).size).toBe(0);
  });

  it('judges the same measurement identically in either unit', () => {
    // 18 in is 457 mm is 45.7 cm. The record does not change when the toggle does.
    expect(taken({ kameezShoulder: '18' }, 'IN').has(pointId('kameezShoulder'))).toBe(true);
    expect(taken({ kameezShoulder: '45.7' }, 'CM').has(pointId('kameezShoulder'))).toBe(true);
  });

  it('counts only required measurements towards progress', () => {
    // The cuff is optional: taking it moves nothing towards a complete form.
    expect(requiredTaken(EVERY_POINT, taken({ kameezCuff: '4.5' }))).toBe(0);
    expect(requiredTaken(EVERY_POINT, taken({ kameezCuff: '4.5', kameezChest: '21' }))).toBe(1);
  });

  it('ignores a figure for a point the list does not carry', () => {
    // A figure typed for a waistcoat survives a switch to a kameez shalwar, and
    // must not count towards a list that no longer asks for it.
    expect(takenIds([pointOfList('kameezChest')], { waistcoatChest: '21' }, 'IN').size).toBe(0);
  });
});

function pointOfList(id: string) {
  const point = EVERY_POINT.find((candidate) => candidate.id === id);
  if (point === undefined) throw new Error(`no measurement ${id}`);
  return point;
}
