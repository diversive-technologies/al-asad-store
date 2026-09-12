/**
 * A NOTE: a figure the server's rules ask about, which the customer answers by
 * measuring again or by keeping their number (A2-5, A2-8).
 *
 * MOD-04 — pure. A note is only ever a finding the server sent; nothing here
 * decides that a figure is unusual.
 */

import type { MeasurementPointId, RuleId } from '@/lib/domain/ids';

import type { Acknowledgement, Finding } from '../schemas/profile.schema';

/** A finding a customer can answer: it asks, and it names both a rule and a field. */
export type Note = Finding & { readonly ruleId: RuleId; readonly pointId: MeasurementPointId };

export function isNote(finding: Finding): finding is Note {
  return finding.severity === 'CONFIRM' && finding.ruleId !== null && finding.pointId !== null;
}

/**
 * One note, for holding an answer against. The DIRECTION is part of it: a figure
 * that moves from too small to too large is a different question, and an answer
 * to the old one should not cover it.
 */
export const noteKey = (note: Note): string =>
  `${note.ruleId}|${note.pointId}|${note.direction ?? ''}`;

export const acknowledgementOf = (note: Note): Acknowledgement => ({
  ruleId: note.ruleId,
  pointId: note.pointId,
  direction: note.direction,
});

/** Whether an answer is the answer to this finding — the server judges it again. */
export const answers = (acknowledgement: Acknowledgement, finding: Finding): boolean =>
  acknowledgement.ruleId === finding.ruleId &&
  acknowledgement.pointId === finding.pointId &&
  acknowledgement.direction === finding.direction;
