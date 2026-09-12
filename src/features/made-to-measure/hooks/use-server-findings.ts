'use client';

import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type { MeasurementPointId } from '@/lib/domain/ids';

import { basisOf, figuresStand, type FigureBasis } from '../lib/standing';
import type { Unit } from '../lib/units';
import type { MeasurementEntry } from '../schemas/measurement.schema';
import type { MeasurementPoint } from '../schemas/measurement-set.schema';
import type { Finding, TypedPointEntry } from '../schemas/profile.schema';

interface PlacedFinding {
  readonly finding: Finding;
  /** The figures the server judged, as they were SENT. */
  readonly basis: FigureBasis;
}

export interface UseServerFindingsResult {
  /** The finding on a field, while every figure it is about is unchanged. */
  readonly standingOn: (id: MeasurementPointId) => Finding | undefined;
  /** Places the server's refusals on the fields they are about; answers how many. */
  readonly place: (findings: readonly Finding[], sent: readonly TypedPointEntry[]) => number;
}

/**
 * The server's REFUSALS, on the fields they are about — for as long as they are
 * TRUE. A finding is about its own field and the fields it names: a hem narrower
 * than the chest stops standing when either figure changes, so re-measuring the
 * chest clears the hem too. Judged against the figures, rather than cleared by an
 * effect, so nothing has to remember to clear it.
 *
 * A finding that only ASKS never comes here: it would be red, `aria-invalid` and
 * in the error summary, which is what a refusal means. Those go to
 * `useFieldNotes`.
 *
 * What is kept is which findings are SHOWN — an event's result, not a copy of
 * server state to keep in step (STATE-02): each check or save replaces it whole.
 */
export function useServerFindings(
  form: UseFormReturn<MeasurementEntry>,
  points: readonly MeasurementPoint[],
  values: Readonly<Record<string, string | undefined>>,
  unit: Unit,
): UseServerFindingsResult {
  const [placed, setPlaced] = useState<ReadonlyMap<MeasurementPointId, PlacedFinding>>(new Map());

  function standingOn(id: MeasurementPointId): Finding | undefined {
    const entry = placed.get(id);
    if (entry === undefined) return undefined;
    return figuresStand(entry.basis, points, values, unit) ? entry.finding : undefined;
  }

  function place(findings: readonly Finding[], sent: readonly TypedPointEntry[]): number {
    const refused = findings.filter((finding) => finding.severity === 'REFUSED');
    const onFields = refused.flatMap((finding) =>
      finding.pointId === null
        ? []
        : ([
            [
              finding.pointId,
              { finding, basis: basisOf([finding.pointId, ...finding.relatedPoints], sent) },
            ],
          ] as const),
    );
    /* An answer replaces the last one whole, so a field refused before and not
       now is no longer red — a check can come back with only notes. */
    for (const [pointId] of placed) form.clearErrors(pointId);
    setPlaced(new Map(onFields));
    for (const [pointId] of onFields) form.setError(pointId, { type: 'server' });
    return onFields.length;
  }

  return { standingOn, place };
}
