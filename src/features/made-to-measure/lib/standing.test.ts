import { describe, expect, it } from 'vitest';

import { basisOf, figuresStand } from './standing';
import { pointId, servedSet } from './test-support';

const POINTS = servedSet('KAMEEZ_SHALWAR').points;

const sent = (raw: string, unit: 'IN' | 'CM', id = 'kameezShoulder') => [
  { pointId: pointId(id), raw, unit },
];

describe('whether the figures an answer was about still stand', () => {
  it('survives a unit switch, and the switch back', () => {
    // 18.25 in is 46.4 cm on screen, and comes back as exactly 18.25.
    const basis = basisOf(['kameezShoulder'], sent('18.25', 'IN'));
    expect(figuresStand(basis, POINTS, { kameezShoulder: '18.25' }, 'IN')).toBe(true);
    expect(figuresStand(basis, POINTS, { kameezShoulder: '46.4' }, 'CM')).toBe(true);
  });

  it('survives a figure the other unit has to show at its own limit', () => {
    // A 33 cm neck converts to 12.99 in, which its own field would refuse, so the
    // switch shows 13 — a figure the customer never typed, and still theirs.
    const basis = basisOf(['kameezNeck'], sent('33', 'CM', 'kameezNeck'));
    expect(figuresStand(basis, POINTS, { kameezNeck: '13' }, 'IN')).toBe(true);
    expect(figuresStand(basis, POINTS, { kameezNeck: '12.99' }, 'IN')).toBe(false);
  });

  it('falls away when its own figure changes, or one it was judged against', () => {
    const basis = basisOf(
      ['kameezBottom', 'kameezChest'],
      [
        { pointId: pointId('kameezBottom'), raw: '22', unit: 'IN' },
        { pointId: pointId('kameezChest'), raw: '21', unit: 'IN' },
      ],
    );
    const values = { kameezBottom: '22', kameezChest: '21' };
    expect(figuresStand(basis, POINTS, values, 'IN')).toBe(true);
    expect(figuresStand(basis, POINTS, { ...values, kameezBottom: '23' }, 'IN')).toBe(false);
    // Re-measuring the chest clears what the hem was told about it.
    expect(figuresStand(basis, POINTS, { ...values, kameezChest: '20' }, 'IN')).toBe(false);
  });

  it('reads the field the way the figure was sent — an Urdu keyboard, or a card fraction', () => {
    // What is sent is normalised (`typedEntriesOf`), so the basis holds 19.5 while
    // the field still shows what was typed. Compared literally, nothing would ever
    // stand for these customers and no finding could reach them.
    const basis = basisOf(['kameezChest'], sent('19.5', 'IN', 'kameezChest'));
    expect(figuresStand(basis, POINTS, { kameezChest: '۱۹٫۵' }, 'IN')).toBe(true);
    expect(figuresStand(basis, POINTS, { kameezChest: '19½' }, 'IN')).toBe(true);
    expect(figuresStand(basis, POINTS, { kameezChest: '۲۰' }, 'IN')).toBe(false);
  });

  it('holds an empty field to being empty', () => {
    const basis = basisOf(['kameezCuff'], []);
    expect(figuresStand(basis, POINTS, {}, 'IN')).toBe(true);
    expect(figuresStand(basis, POINTS, { kameezCuff: '' }, 'IN')).toBe(true);
    expect(figuresStand(basis, POINTS, { kameezCuff: '4.5' }, 'IN')).toBe(false);
  });
});
