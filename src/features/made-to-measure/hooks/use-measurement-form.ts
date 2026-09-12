'use client';

import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';

import { useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import type { MeasurementPointId } from '@/lib/domain/ids';

import { takenIds, type MeasurementEntries } from '../lib/entries';
import type { FieldProblem } from '../lib/field-problems';
import { DEFAULT_UNIT, type Unit } from '../lib/units';
import {
  buildMeasurementSchema,
  emptyEntry,
  type MeasurementEntry,
} from '../schemas/measurement.schema';
import type { MeasurementPoint } from '../schemas/measurement-set.schema';
import type { Finding, TypedPointEntry } from '../schemas/profile.schema';
import { useServerFindings } from './use-server-findings';
import { useSummarySubmit } from './use-summary-submit';
import { useUnitConversion } from './use-unit-conversion';

export interface UseMeasurementFormResult {
  readonly form: UseFormReturn<MeasurementEntry>;
  readonly values: MeasurementEntries;
  readonly unit: Unit;
  readonly changeUnit: (next: Unit) => void;
  /** Holding a figure the field accepts — what the marks and the count read. */
  readonly filledIds: ReadonlySet<MeasurementPointId>;
  /** In the served order, so the summary lists them the way the form asks. */
  readonly errorIds: readonly MeasurementPointId[];
  /** Why each field with an error has one: a server finding, or its own range. */
  readonly problems: ReadonlyMap<MeasurementPointId, FieldProblem>;
  readonly summaryRef: RefObject<HTMLDivElement | null>;
  readonly submit: (event: FormEvent<HTMLFormElement>, onValid: () => Promise<void>) => void;
  readonly typedEntries: () => readonly TypedPointEntry[];
  /** Places the server's refusals on their fields, and lands focus on the summary. */
  readonly showFindings: (
    findings: readonly Finding[],
    sent: readonly TypedPointEntry[],
  ) => void;
}

/**
 * FORM-01 — the studio's form, over whichever list was served.
 *
 * The schema is rebuilt from the list and the unit on every render, so a switch
 * of either is validated against at once. A switch of STYLE keeps every figure:
 * a point is measured the same way in whichever style it appears (§34.3). The
 * browser's checks are an affordance; the server's findings are the authority,
 * and they are shown on the same fields (§34.7).
 *
 * `points` are the ones ASKED; `served` is the whole list, so a unit switch shows
 * a figure on a point the choices have set aside at a value that point accepts
 * when it is asked again.
 */
export function useMeasurementForm(
  points: readonly MeasurementPoint[],
  served: readonly MeasurementPoint[],
): UseMeasurementFormResult {
  const [unit, setUnit] = useState<Unit>(DEFAULT_UNIT);

  const form = useForm<MeasurementEntry>({
    resolver: zodResolver(buildMeasurementSchema(points, unit)),
    defaultValues: emptyEntry(points),
    // Nothing goes red until a check is asked for; after that, fixes are judged as typed.
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    // The SUMMARY takes focus, not the first bad field — see `useSummarySubmit`.
    shouldFocusError: false,
  });

  /* `useWatch` rather than `form.watch()`: the latter returns a fresh function
     each render, which makes React Compiler skip memoising the component. */
  const values = useWatch({ control: form.control });
  const { changeUnit, typedEntries } = useUnitConversion(form, { points, served }, unit, setUnit);
  const findings = useServerFindings(form, points, values, unit);

  /* A server finding shows while it still stands (`useServerFindings`); one whose
     figures have changed since is simply not shown, whatever the form still holds. */
  const problems = new Map<MeasurementPointId, FieldProblem>(
    points.flatMap((point): (readonly [MeasurementPointId, FieldProblem])[] => {
      const error = form.formState.errors[point.id];
      if (error === undefined) return [];
      if (error.type !== 'server') return [[point.id, 'RANGE']];
      const finding = findings.standingOn(point.id);
      return finding === undefined ? [] : [[point.id, finding]];
    }),
  );
  const errorIds = [...problems.keys()];
  const { submit, summaryRef, requestSummaryFocus } = useSummarySubmit(form, errorIds.length);

  /* STATE-04 — a unit switch changes what every figure means to the schema, so
     once a check has been asked for, the errors on screen are judged again in the
     new unit. An effect because the resolver that judges them is the NEXT
     render's; the ref only remembers which unit was last judged. */
  const judgedUnit = useRef(unit);
  useEffect(() => {
    if (judgedUnit.current === unit) return;
    judgedUnit.current = unit;
    if (form.formState.isSubmitted) void form.trigger();
  }, [unit, form]);

  return {
    form,
    values,
    unit,
    changeUnit,
    filledIds: takenIds(points, values, unit),
    errorIds,
    problems,
    summaryRef,
    submit,
    typedEntries,
    /* Only a refusal asks for the summary. Armed with nothing on screen, the
       one-shot flag would spend itself on the next range error instead, and
       focus would jump away mid-typing. */
    showFindings: (next, sent) => {
      if (findings.place(next, sent) > 0) requestSummaryFocus();
    },
  };
}
