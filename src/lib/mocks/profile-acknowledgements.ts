import type { AcknowledgementRow, FindingRow } from './profile-rules';

/**
 * D1 — what a customer chose to KEEP, settled against what the rules actually
 * said (A2-5, A2-8), standing in for Java.
 *
 * A confirmation is answered when the customer says to keep their figure against
 * that rule, on that point, in that direction. Everything still outstanding after
 * that blocks the save, a confirmation nobody answered included — otherwise a
 * figure the store thinks is unusual is kept with no record that anyone looked.
 */

const answers = (sent: AcknowledgementRow, found: FindingRow): boolean =>
  found.ruleId === sent.ruleId &&
  found.pointId === sent.pointId &&
  found.direction === sent.direction;

export interface SettledAcknowledgements {
  /** Every finding still standing in the way, refusals and unanswered notes alike. */
  readonly outstanding: FindingRow[];
  /** What is recorded as kept — built from the SERVER's findings, never from the body. */
  readonly matched: AcknowledgementRow[];
}

/**
 * A confirmation the customer answered leaves the way clear and is recorded; a
 * refusal can never be answered, so it always stands.
 *
 * An acknowledgement that answers nothing — an unfired rule, the other direction,
 * a point the choices do not ask, a second copy — is IGNORED rather than refused.
 * It is stored nowhere, so a profile cannot claim a figure was kept against a rule
 * that never fired; and refusing it would need a reason the page reads as a
 * changed list, which would leave the customer with nothing to press.
 */
export function settleAcknowledgements(
  findings: readonly FindingRow[],
  sent: readonly AcknowledgementRow[],
): SettledAcknowledgements {
  const outstanding: FindingRow[] = [];
  const matched: AcknowledgementRow[] = [];

  for (const found of findings) {
    const answered =
      found.severity === 'CONFIRM' && sent.some((acknowledgement) => answers(acknowledgement, found));
    if (!answered) {
      outstanding.push(found);
      continue;
    }
    if (found.ruleId === null || found.pointId === null) continue;
    matched.push({ ruleId: found.ruleId, pointId: found.pointId, direction: found.direction });
  }

  return { outstanding, matched };
}
