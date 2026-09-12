import { GARMENT_POINT_OF } from './measurement-card-points-db';
import {
  conditionHolds,
  isAskedRow,
  settleChoices,
  type PreferenceRow,
} from './measurement-options-db';
import type { SetRow } from './measurement-sets-db';
import { currentRuleSet, type RuleRow } from './profile-rule-rows';
import {
  deriveMm,
  finding,
  rangeFinding,
  refused,
  type CheckRow,
  type FindingRow,
  type TypedEntryRow,
} from './profile-rules';

/**
 * D1 — judging one submission against a list and the tailor's rules (§34.4
 * `validate`), standing in for Java. The rows are `profile-rule-rows.ts` and the
 * derivation is `profile-rules.ts`; nothing here holds a number of its own.
 *
 * A rule names a GARMENT point, and a card point answers for the point it was
 * copied from, so one row holds on both paths and cannot drift between them.
 */

/** The point on THIS list that plays a rule's part, if it has one. */
export function rulePointOn(set: SetRow, garmentPointId: string): string | undefined {
  return set.points.find(
    (point) => point.id === garmentPointId || GARMENT_POINT_OF.get(point.id) === garmentPointId,
  )?.id;
}

/* A2-6, in integers throughout so this and Java cannot drift on floating point:
   the expected figure, then the distance from it, with the two sides apart. */
const expectedFor = (rule: RuleRow, fromMm: number): number =>
  Math.floor((rule.permille * fromMm + 500) / 1000) + rule.offsetMm;

function directionOf(rule: RuleRow, valueMm: number, expectedMm: number): 'ABOVE' | 'BELOW' | null {
  const distance = valueMm - expectedMm;
  if (distance < -rule.toleranceBelowMm) return 'BELOW';
  if (rule.toleranceAboveMm !== null && distance > rule.toleranceAboveMm) return 'ABOVE';
  return null;
}

/**
 * One rule against what was recorded, or null where it says nothing.
 *
 * A rule is SKIPPED, never an error, when its condition does not hold, when this
 * list has no point for either part, or when either figure is missing — and a
 * figure is missing when it was not asked, could not be read or was out of range,
 * because only figures that stand are recorded. So a note only ever appears once
 * the figures it is about are readable and in range.
 */
function judgeRule(
  rule: RuleRow,
  set: SetRow,
  recorded: ReadonlyMap<string, number>,
  chosen: ReadonlyMap<string, string>,
): FindingRow | null {
  if (!conditionHolds(rule.when, chosen)) return null;
  const pointId = rulePointOn(set, rule.point);
  const fromId = rulePointOn(set, rule.from);
  if (pointId === undefined || fromId === undefined) return null;

  const valueMm = recorded.get(pointId);
  const fromMm = recorded.get(fromId);
  if (valueMm === undefined || fromMm === undefined) return null;

  const expectedMm = expectedFor(rule, fromMm);
  const direction = directionOf(rule, valueMm, expectedMm);
  if (direction === null) return null;

  const isMust = rule.severity === 'MUST';
  return finding(isMust ? 'REFUSED' : 'CONFIRM', pointId, isMust ? 'ORDER' : 'DEVIATION', {
    ruleId: rule.id,
    relatedPoints: [fromId],
    direction,
    // Withheld unless the row allows it, so no target figure ever reaches the page.
    expectedMm: rule.showsTarget ? expectedMm : null,
  });
}

/**
 * Every rule that has something to say, refusals first, each set in its declared
 * order — so the same submission always gives the same findings. A quiet note is
 * dropped where the same field is already refused: a note under a red field is
 * noise.
 */
export function ruleFindings(
  set: SetRow,
  recorded: ReadonlyMap<string, number>,
  chosen: ReadonlyMap<string, string>,
  rules: readonly RuleRow[],
): FindingRow[] {
  const found: FindingRow[] = [];
  const alreadyRefused = new Set<string>();

  for (const severity of ['MUST', 'WARN'] as const) {
    for (const rule of rules.filter((candidate) => candidate.severity === severity)) {
      const row = judgeRule(rule, set, recorded, chosen);
      if (row === null || row.pointId === null) continue;
      if (severity === 'WARN' && alreadyRefused.has(row.pointId)) continue;
      if (severity === 'MUST') alreadyRefused.add(row.pointId);
      found.push(row);
    }
  }

  return found;
}

/**
 * Every finding against one list, as its finishing choices leave it, and the
 * millimetres of every figure that stands. Only the points the choices ask for
 * are required, and a figure for one they do not ask for is refused — a cuff sent
 * with a plain sleeve.
 */
export function checkEntries(
  set: SetRow,
  entries: readonly TypedEntryRow[],
  preferences: readonly PreferenceRow[],
  rules: readonly RuleRow[] = currentRuleSet().rows,
): CheckRow {
  const { chosen, problems } = settleChoices(set.options, preferences);
  const findings: FindingRow[] = problems.map((reason) => refused(null, reason));
  const recorded = new Map<string, number>();
  const asked = set.points.filter((point) => isAskedRow(point, chosen));

  for (const entry of entries) {
    const point = set.points.find((candidate) => candidate.id === entry.pointId);
    if (point === undefined || !asked.includes(point)) {
      findings.push(refused(entry.pointId, point === undefined ? 'UNKNOWN_POINT' : 'POINT_NOT_ASKED'));
      continue;
    }
    const mm = deriveMm(point, entry.raw, entry.unit);
    const problem = mm === null ? refused(point.id, 'UNREADABLE') : rangeFinding(point, mm);
    if (problem !== null) findings.push(problem);
    else if (mm !== null) recorded.set(point.id, mm);
  }

  for (const point of asked) {
    if (point.required && !entries.some((entry) => entry.pointId === point.id)) {
      findings.push(refused(point.id, 'REQUIRED'));
    }
  }

  findings.push(...ruleFindings(set, recorded, chosen, rules));
  return {
    findings,
    recorded: [...recorded].map(([pointId, valueMm]) => ({ pointId, valueMm })),
  };
}
