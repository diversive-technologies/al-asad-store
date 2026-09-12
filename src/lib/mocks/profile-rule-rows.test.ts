import { describe, expect, it } from 'vitest';

import { MEASUREMENT_CODE } from '@/lib/domain/ids';

import { measurementSetFor, type SetRow } from './measurement-sets-db';
import { checkEntries, rulePointOn } from './profile-rule-eval';
import { currentRuleSet, RULE_SETS } from './profile-rule-rows';
import type { TypedEntryRow, Unit } from './profile-rules';

/*
 * The tailor's rules, on FIXTURE rows. Figures are given in the unit that makes
 * the millimetres exact: a chest of 21 in records 1067 mm, so the shoulder rule
 * expects 465 mm (0.436), and centimetres then name a stored figure directly.
 */

const listFor = (style: string, source?: string): SetRow => {
  const set = measurementSetFor(style, undefined, source);
  if (set === null) throw new Error(`no list for ${style}`);
  return set;
};

const GARMENT = listFor('KAMEEZ_SHALWAR');
const CARD = listFor('KAMEEZ_SHALWAR', 'TAILOR_CARD');
const SUIT = listFor('WAISTCOAT_SUIT');

const entry = (pointId: string, raw: string, unit: Unit = 'IN'): TypedEntryRow => ({
  pointId,
  raw,
  unit,
});

/** Only the figures a rule needs: the rest come back REQUIRED, which no rule reads. */
const rulesOn = (set: SetRow, entries: TypedEntryRow[], preferences: { group: string; value: string }[] = []) =>
  checkEntries(set, entries, preferences).findings.filter((found) => found.ruleId !== null);

const CHEST_21 = entry('kameezChest', '21');

describe('a soft rule asks rather than refuses (A2-6)', () => {
  it('fires one millimetre past the small side, naming the figure it was judged against', () => {
    // Chest 1067 expects a 465 mm shoulder; 439 is 26 below, past a 25 mm tolerance.
    expect(rulesOn(GARMENT, [CHEST_21, entry('kameezShoulder', '43.9', 'CM')])).toEqual([
      {
        pointId: 'kameezShoulder',
        ruleId: 'shoulderForChest',
        severity: 'CONFIRM',
        reason: 'DEVIATION',
        relatedPoints: ['kameezChest'],
        direction: 'BELOW',
        // No target figure travels: the row withholds it.
        expectedMm: null,
      },
    ]);
    expect(rulesOn(GARMENT, [CHEST_21, entry('kameezShoulder', '44', 'CM')])).toEqual([]);
  });

  it('is tighter below than above — cloth cut too small cannot be let out', () => {
    const shoulder = (mmAsCm: string) =>
      rulesOn(GARMENT, [CHEST_21, entry('kameezShoulder', mmAsCm, 'CM')]);
    // 30 mm under fires; the same distance over does not.
    expect(shoulder('43.5').map((found) => found.direction)).toEqual(['BELOW']);
    expect(shoulder('49.5')).toEqual([]);
    // Past the large side it does fire, the other way.
    expect(shoulder('51.6').map((found) => found.direction)).toEqual(['ABOVE']);
    // A figure on either edge says nothing.
    expect(shoulder('44')).toEqual([]);
    expect(shoulder('51.5')).toEqual([]);
  });

  it('says nothing while either figure is missing, unreadable or out of range', () => {
    const short = entry('kameezShoulder', '43.5', 'CM');
    expect(rulesOn(GARMENT, [short])).toEqual([]);
    expect(rulesOn(GARMENT, [entry('kameezChest', 'twenty'), short])).toEqual([]);
    // 42 in across is beyond the chest's own range, so nothing is recorded to judge.
    expect(rulesOn(GARMENT, [entry('kameezChest', '42'), short])).toEqual([]);
    // The same figures with a chest in range: the guard is not a short-circuit.
    expect(rulesOn(GARMENT, [CHEST_21, short])).toHaveLength(1);
  });
});

describe('a rule row and the list it lands on', () => {
  it('holds the hem rule exactly as Phase 3 stated it', () => {
    const narrow = rulesOn(GARMENT, [
      entry('kameezChest', '70', 'CM'),
      entry('kameezBottom', '50', 'CM'),
    ]);
    expect(narrow).toContainEqual(
      expect.objectContaining({
        pointId: 'kameezBottom',
        ruleId: 'hemAtLeastChest',
        severity: 'REFUSED',
        reason: 'ORDER',
        direction: 'BELOW',
        expectedMm: 1400,
      }),
    );
  });

  it('follows the finishing choice it names', () => {
    // A neck of 433 mm is 39 above the 394 a 1067 chest expects: past a ban's 38,
    // inside a collar's 51.
    const neck = [CHEST_21, entry('kameezNeck', '43.3', 'CM')];
    const ban = rulesOn(GARMENT, neck, [{ group: 'neckStyle', value: 'BAN' }]);
    const collar = rulesOn(GARMENT, neck, [{ group: 'neckStyle', value: 'COLLAR' }]);
    expect(ban.map((found) => found.ruleId)).toEqual(['neckForChestBan']);
    expect(collar).toEqual([]);
  });

  it('relates points across the pieces of one set, and is skipped where a piece is absent', () => {
    const figures = [CHEST_21, entry('waistcoatChest', '20')];
    expect(rulesOn(SUIT, figures).map((found) => found.ruleId)).toEqual(['waistcoatOverKameez']);
    expect(rulesOn(GARMENT, figures).filter((found) => found.ruleId === 'waistcoatOverKameez')).toEqual(
      [],
    );
  });

  it('is written ONCE and holds on both paths', () => {
    const holdsOn = (set: SetRow, rule: { point: string; from: string }) =>
      rulePointOn(set, rule.point) !== undefined && rulePointOn(set, rule.from) !== undefined;

    // Whatever a rule can judge on a style's garment list, it judges on its card
    // list too — so no rule can be kept up to date on one path and drift on the other.
    for (const rule of currentRuleSet().rows) {
      expect(holdsOn(CARD, rule), `${rule.id} on the card path`).toBe(holdsOn(GARMENT, rule));
    }

    // The client's own example, with a ghera narrower than the chest.
    const onCard = rulesOn(CARD, [
      entry('kameezCardChest', '19.5'),
      entry('kameezCardGhera', '19'),
    ]);
    expect(onCard).toContainEqual(
      expect.objectContaining({
        pointId: 'kameezCardGhera',
        ruleId: 'hemAtLeastChest',
        severity: 'REFUSED',
      }),
    );
  });
});

describe('the rule set itself', () => {
  it('names every rule once, in the shape an id has', () => {
    for (const set of RULE_SETS) {
      const ids = set.rows.map((rule) => rule.id);
      expect(new Set(ids).size, `set ${String(set.version)}`).toBe(ids.length);
      for (const id of ids) {
        expect(MEASUREMENT_CODE.test(id), id).toBe(true);
        expect(id.length).toBeLessThanOrEqual(64);
      }
    }
  });

  it('can always be satisfied by a figure its field accepts', () => {
    /* A ratio fitted without the points' own bounds leaves a customer re-measuring
       against a note that no accepted figure can clear, with only "keep my number"
       to escape it — and an acknowledgement then stands against a rule the data
       made impossible. For every figure a list accepts, some accepted figure on
       the other field must clear the rule. */
    for (const rule of currentRuleSet().rows) {
      for (const set of [GARMENT, CARD, SUIT]) {
        const point = set.points.find((row) => row.id === rulePointOn(set, rule.point));
        const from = set.points.find((row) => row.id === rulePointOn(set, rule.from));
        if (point === undefined || from === undefined) continue;
        const where = `${rule.id} on ${set.garmentStyle} ${set.source}`;
        const expectedAt = (fromMm: number) =>
          Math.floor((rule.permille * fromMm + 500) / 1000) + rule.offsetMm;
        // The widest figure it could be judged against, still reachable from below.
        expect(point.maxMm, where).toBeGreaterThanOrEqual(
          expectedAt(from.maxMm) - rule.toleranceBelowMm,
        );
        // And the narrowest, still reachable from above.
        if (rule.toleranceAboveMm !== null) {
          expect(point.minMm, where).toBeLessThanOrEqual(
            expectedAt(from.minMm) + rule.toleranceAboveMm,
          );
        }
      }
    }
  });

  it('gives no target figure with anything it only asks about', () => {
    for (const rule of currentRuleSet().rows) {
      if (rule.severity === 'WARN') expect(rule.showsTarget, rule.id).toBe(false);
    }
  });

  it('answers the same submission the same way, whatever order it arrives in', () => {
    const entries = [CHEST_21, entry('kameezShoulder', '43.5', 'CM'), entry('kameezNeck', '15.5')];
    const once = checkEntries(GARMENT, entries, []);
    const twice = checkEntries(GARMENT, entries, []);
    const reversed = checkEntries(GARMENT, [...entries].reverse(), []);
    expect(twice).toEqual(once);
    expect(new Set(reversed.findings.map((found) => JSON.stringify(found)))).toEqual(
      new Set(once.findings.map((found) => JSON.stringify(found))),
    );
  });

  it('is injectable, and the set Phase 3 shipped asks nothing', () => {
    const v1 = RULE_SETS.find((set) => set.version === 1);
    if (v1 === undefined) throw new Error('no v1 rule set');
    const soft = checkEntries(
      GARMENT,
      [CHEST_21, entry('kameezShoulder', '43.5', 'CM')],
      [],
      v1.rows,
    ).findings.filter((found) => found.severity === 'CONFIRM');
    expect(soft).toEqual([]);
    expect(v1.rows.map((rule) => rule.id)).toEqual(['hemAtLeastChest']);
  });
});
