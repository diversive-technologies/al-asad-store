'use client';

import { useEffect, useRef, type FormEvent, type RefObject } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type { MeasurementEntry } from '../schemas/measurement.schema';

export interface UseSummarySubmitResult {
  /**
   * Validates the form, then runs `onValid` — the server's check. The browser's
   * own check failing lands focus on the error summary.
   */
  readonly submit: (event: FormEvent<HTMLFormElement>, onValid: () => Promise<void>) => void;
  /** Lands focus on the summary once it next shows — what a server refusal asks. */
  readonly requestSummaryFocus: () => void;
  readonly summaryRef: RefObject<HTMLDivElement | null>;
}

/**
 * FORM-05 / FORM-06 — one submit at a time, and a failed check lands on the
 * error SUMMARY rather than on the first bad field: with a form this long, one
 * empty box says nothing about the others.
 */
export function useSummarySubmit(
  form: UseFormReturn<MeasurementEntry>,
  errorCount: number,
): UseSummarySubmitResult {
  const summaryRef = useRef<HTMLDivElement>(null);
  const wantsSummaryFocus = useRef(false);
  // FORM-06, synchronously — `isSubmitting` only flips after a re-render.
  const inFlight = useRef(false);

  function submit(event: FormEvent<HTMLFormElement>, onValid: () => Promise<void>): void {
    if (inFlight.current) {
      event.preventDefault();
      return;
    }
    inFlight.current = true;
    /* Intent is recorded BEFORE the submit. React re-renders with the new errors
       before the promise settles, so a flag set in `.finally` arrived one render
       too late and the effect that reads it had already run. The latch holds
       through the server's check, so a second press cannot send a second one. */
    wantsSummaryFocus.current = true;
    void form
      .handleSubmit(async () => {
        /* The browser's check passed, so there is nothing of its own to land on.
           A refusal from the server asks for the summary itself, so a check that
           passes — or one overtaken by a style switch — never pulls focus. */
        wantsSummaryFocus.current = false;
        await onValid();
      })(event)
      .finally(() => {
        inFlight.current = false;
      });
  }

  /* Un-keyed on purpose: it runs after every render and spends a one-shot flag
     once the summary exists, so focus lands there exactly once per failed submit
     and never jumps back while the fields are being fixed. */
  useEffect(() => {
    if (!wantsSummaryFocus.current || errorCount === 0) return;
    wantsSummaryFocus.current = false;
    summaryRef.current?.focus();
  });

  return {
    submit,
    requestSummaryFocus: () => {
      wantsSummaryFocus.current = true;
    },
    summaryRef,
  };
}
