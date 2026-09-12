import type { PointRow } from './measurement-points-db';

/**
 * D1 — module 18's derivation and the shape of what it says back (§34.4, A2-2,
 * A2-5), standing in for Java. The RULES are rows in `profile-rule-rows.ts` and
 * are judged by `profile-rule-eval.ts`; the store is `profiles-db.ts`.
 *
 * The page only ever sees findings, each with a reason and — for a rule — the
 * rule's id, so a customer can keep their number against it by name (A2-8), and
 * so the words stay ours in both languages. The server never sends a sentence.
 */

export type Unit = 'IN' | 'CM';

export interface TypedEntryRow {
  pointId: string;
  raw: string;
  unit: Unit;
}

/** A2-8 — a finding the customer answered by keeping their figure. */
export interface AcknowledgementRow {
  ruleId: string;
  pointId: string;
  direction: 'ABOVE' | 'BELOW' | null;
}

export interface FindingRow {
  pointId: string | null;
  ruleId: string | null;
  /** REFUSED stands in the way; CONFIRM asks, and a kept figure answers it. */
  severity: 'REFUSED' | 'CONFIRM';
  reason:
    | 'OUT_OF_RANGE'
    | 'UNREADABLE'
    | 'REQUIRED'
    | 'ORDER'
    | 'DEVIATION'
    | 'UNKNOWN_POINT'
    | 'POINT_NOT_ASKED'
    | 'OPTION_UNKNOWN'
    | 'OPTION_NOT_APPLICABLE'
    | 'SET_VERSION_UNKNOWN'
    | 'SET_VERSION_SUPERSEDED';
  relatedPoints: string[];
  direction: 'ABOVE' | 'BELOW' | null;
  expectedMm: number | null;
}

export interface CheckRow {
  findings: FindingRow[];
  recorded: { pointId: string; valueMm: number }[];
}

const MM_PER_UNIT: Readonly<Record<Unit, number>> = { IN: 25.4, CM: 10 };

/* A typed figure is ASCII decimal digits, at most four before the point and two
   after (A2-2). The page normalises an Urdu keyboard's digits before sending. */
const TYPED_FIGURE = /^\d{1,4}(?:\.\d{1,2})?$/;

/**
 * Java's derivation: multiply into millimetres, double a half, round ONCE, half
 * up (A2-2). Null for anything that is not a typed figure.
 */
export function deriveMm(point: PointRow, raw: string, unit: Unit): number | null {
  const figure = raw.trim();
  if (!TYPED_FIGURE.test(figure)) return null;
  const mm = Number(figure) * MM_PER_UNIT[unit];
  return Math.round(point.enteredAs === 'HALF' ? mm * 2 : mm);
}

/** One finding, of either severity — the only place the shape is built. */
export function finding(
  severity: FindingRow['severity'],
  pointId: string | null,
  reason: FindingRow['reason'],
  detail: Partial<Pick<FindingRow, 'ruleId' | 'relatedPoints' | 'direction' | 'expectedMm'>> = {},
): FindingRow {
  return {
    pointId,
    ruleId: null,
    severity,
    reason,
    relatedPoints: [],
    direction: null,
    expectedMm: null,
    ...detail,
  };
}

/** A finding that stands in the way whatever the customer says. */
export function refused(
  pointId: string | null,
  reason: FindingRow['reason'],
  detail: Partial<Pick<FindingRow, 'ruleId' | 'relatedPoints' | 'direction' | 'expectedMm'>> = {},
): FindingRow {
  return finding('REFUSED', pointId, reason, detail);
}

export function rangeFinding(point: PointRow, mm: number): FindingRow | null {
  if (mm < point.minMm) {
    return refused(point.id, 'OUT_OF_RANGE', { direction: 'BELOW', expectedMm: point.minMm });
  }
  if (mm > point.maxMm) {
    return refused(point.id, 'OUT_OF_RANGE', { direction: 'ABOVE', expectedMm: point.maxMm });
  }
  return null;
}
