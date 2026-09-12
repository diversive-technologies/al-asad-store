import { describe, expect, it } from 'vitest';

import { acceptsEntry, enteredBounds, showAccepted, writtenOtherWay } from './conversion';
import { EVERY_POINT, pointOf as byId } from './test-support';
import { DECIMALS, formatFigure, UNITS, type Unit } from './units';

// The record's own order (multiply, double a half, round once) is the server's,
// and is tested there: `src/lib/mocks/profiles-db.test.ts`.

describe('a figure written the other way', () => {
  it('tells a whole chest typed where the half across is read', () => {
    expect(writtenOtherWay(byId('kameezChest'), '42', 'IN')).toBe('LOOKS_WHOLE');
    expect(writtenOtherWay(byId('kameezChest'), '21', 'IN')).toBeNull();
  });

  it('tells a half shoulder typed where the whole is read', () => {
    // The client's "teera 8.5", typed as a garment's shoulder.
    expect(writtenOtherWay(byId('kameezShoulder'), '8.5', 'IN')).toBe('LOOKS_HALF');
    expect(writtenOtherWay(byId('kameezShoulder'), '5', 'IN')).toBeNull();
  });

  it('never answers for a length, which is never halved', () => {
    expect(writtenOtherWay(byId('kameezLength'), '20', 'IN')).toBeNull();
  });
});

describe('the range a field accepts', () => {
  it('is stated in the figure the customer types — a half, for a half', () => {
    // 800–1500 mm around is 400–750 across: 15.748 and 29.527 in.
    expect(enteredBounds(byId('kameezChest'), 'IN')).toEqual({ min: 15.75, max: 29.52 });
  });

  it('rounds inward, so the printed range never admits a refused value', () => {
    // 330 mm is 12.992 in, printed as 13 rather than as a 12.99 it would refuse;
    // 545 mm is 21.456 in, printed as 21.45 rather than an unreachable 21.46.
    expect(enteredBounds(byId('kameezNeck'), 'IN')).toEqual({ min: 13, max: 21.45 });
    expect(enteredBounds(byId('kameezNeck'), 'CM')).toEqual({ min: 33, max: 54.5 });
  });

  it('accepts the half across and refuses the full figure typed in its place', () => {
    expect(acceptsEntry(byId('kameezChest'), '19.5', 'IN')).toBe(true);
    expect(acceptsEntry(byId('kameezChest'), '39', 'IN')).toBe(false);
  });

  it('refuses a half-neck typed where the whole band is asked for', () => {
    expect(acceptsEntry(byId('kameezNeck'), '15.5', 'IN')).toBe(true);
    expect(acceptsEntry(byId('kameezNeck'), '7.5', 'IN')).toBe(false);
  });

  it('refuses a full cuff typed into the across field', () => {
    // A slim wrist is about 7 in around; across, it would record 14.
    expect(acceptsEntry(byId('kameezCuff'), '4.5', 'IN')).toBe(true);
    expect(acceptsEntry(byId('kameezCuff'), '7', 'IN')).toBe(false);
  });

  it('refuses blanks and anything that is not a number', () => {
    expect(acceptsEntry(byId('kameezChest'), '', 'IN')).toBe(false);
    expect(acceptsEntry(byId('kameezChest'), '   ', 'IN')).toBe(false);
    expect(acceptsEntry(byId('kameezChest'), 'twenty', 'IN')).toBe(false);
  });
});

describe('a unit switch never turns an accepted figure into a refused one', () => {
  it('shows a figure on a limit at that limit, not a step outside it', () => {
    // 33 cm is 12.992 in, which rounds to 12.99 beside a 13 in minimum.
    expect(showAccepted(byId('kameezNeck'), { raw: '33', unit: 'CM' }, 'IN')).toBe('13');
    // 54.5 cm is 21.456 in, which rounds to 21.46 beside a 21.45 in maximum.
    expect(showAccepted(byId('kameezNeck'), { raw: '54.5', unit: 'CM' }, 'IN')).toBe('21.45');
  });

  it('leaves an ordinary conversion and a refused entry exactly as converted', () => {
    expect(showAccepted(byId('kameezNeck'), { raw: '40', unit: 'CM' }, 'IN')).toBe('15.75');
    // Not accepted in the first place, so there is nothing to protect.
    expect(showAccepted(byId('kameezNeck'), { raw: '10', unit: 'CM' }, 'IN')).toBe('3.94');
  });

  it.each([...UNITS])('keeps every accepted %s figure accepted in the other unit', (from) => {
    const to: Unit = from === 'IN' ? 'CM' : 'IN';
    const factor = 10 ** DECIMALS[from];

    for (const measurement of EVERY_POINT) {
      const { min, max } = enteredBounds(measurement, from);
      for (let step = Math.round(min * factor); step <= Math.round(max * factor); step += 1) {
        const raw = formatFigure(step / factor, from);
        const shown = showAccepted(measurement, { raw, unit: from }, to);
        if (!acceptsEntry(measurement, shown, to)) {
          expect.fail(`${measurement.id}: ${raw} ${from} shows as a refused ${shown} ${to}`);
        }
      }
    }
  });
});
