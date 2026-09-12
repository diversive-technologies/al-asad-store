/**
 * What the server said, judged as it lands: a refusal to put on the fields, a
 * note to ask about, a changed list, or a pass.
 *
 * MOD-04 — pure. The rows it judges are the server's; nothing here decides what
 * is unusual, only where the answer goes.
 */

import type { MeasurementPointId } from '@/lib/domain/ids';

import type { Acknowledgement, Finding, MeasurementCheck } from '../schemas/profile.schema';
import type { StudioPoint } from './studio-set';

/** Why the server stood in the way. */
export type Stopped =
  /** Findings to place on the fields they are about. */
  | { readonly kind: 'REFUSED'; readonly findings: readonly Finding[] }
  /** The list this page was served is no longer the one the server holds. */
  | { readonly kind: 'STALE' };

export type CheckVerdict =
  | {
      readonly kind: 'PASSED';
      readonly recorded: ReadonlyMap<MeasurementPointId, number>;
      /** The figures the server counted as kept against a rule. */
      readonly acknowledged: readonly Acknowledgement[];
    }
  /** Nothing refused, but figures the rules ask about — answered on the fields. */
  | { readonly kind: 'NOTED'; readonly findings: readonly Finding[] }
  | Stopped;

/* Reasons that are about the LIST rather than a figure — judged by reason, never
   by a missing point id. A point the server does not know means the page and the
   server hold different lists, which no field can fix. */
const LIST_REASONS: ReadonlySet<Finding['reason']> = new Set([
  'SET_VERSION_UNKNOWN',
  'SET_VERSION_SUPERSEDED',
  'UNKNOWN_POINT',
  // The page and the server disagree about which choices, or points, are in play.
  'POINT_NOT_ASKED',
  'OPTION_UNKNOWN',
  'OPTION_NOT_APPLICABLE',
]);

/**
 * A finding no field on this page can hold: about the list, about no point, or
 * about a point this page's list does not have. Placed on the fields it would
 * vanish, and the customer would be left with a button that does nothing.
 */
function isFieldless(finding: Finding, known: ReadonlySet<MeasurementPointId>): boolean {
  return (
    LIST_REASONS.has(finding.reason) || finding.pointId === null || !known.has(finding.pointId)
  );
}

const changedList = (findings: readonly Finding[], points: readonly StudioPoint[]): boolean => {
  const known = new Set(points.map((point) => point.id));
  return findings.some((finding) => isFieldless(finding, known));
};

/** Which channel each finding belongs to: the red one, or the quiet one. */
export function splitOf(findings: readonly Finding[]): {
  readonly refused: readonly Finding[];
  readonly notes: readonly Finding[];
} {
  return {
    refused: findings.filter((finding) => finding.severity === 'REFUSED'),
    notes: findings.filter((finding) => finding.severity === 'CONFIRM'),
  };
}

/**
 * A check. Staleness is judged over EVERY finding before severity splits them:
 * a note about a point this page does not have says the list changed just as
 * loudly as a refusal does, and dropping it would leave a button that does
 * nothing. A refusal takes the whole answer to the fields, notes included, so a
 * note beside a refusal is not lost.
 */
export function judgeCheck(check: MeasurementCheck, points: readonly StudioPoint[]): CheckVerdict {
  if (changedList(check.findings, points)) return { kind: 'STALE' };
  const { refused, notes } = splitOf(check.findings);
  if (refused.length > 0) return { kind: 'REFUSED', findings: check.findings };
  if (notes.length > 0) return { kind: 'NOTED', findings: notes };
  return {
    kind: 'PASSED',
    recorded: new Map(check.recorded.map((value) => [value.pointId, value.valueMm])),
    acknowledged: check.acknowledged,
  };
}

/**
 * A save the server REJECTED: every finding it sent stood in the way, whatever
 * its severity — a note the customer has not answered is as much a stop as a
 * refusal — so they all go back to the fields rather than reading as a changed
 * list.
 */
export function judgeRejection(
  findings: readonly Finding[],
  points: readonly StudioPoint[],
): Stopped {
  if (findings.length === 0 || changedList(findings, points)) return { kind: 'STALE' };
  return { kind: 'REFUSED', findings };
}
