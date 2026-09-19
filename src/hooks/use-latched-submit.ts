'use client';

import { useRef, type FormEvent } from 'react';

import type { FieldValues, SubmitHandler, UseFormReturn } from 'react-hook-form';

/**
 * FORM-06 — a form's submit handler that can only run once at a time.
 *
 * `formState.isSubmitting` only becomes true after a re-render, so two presses in
 * one tick both pass it; the latch is a ref flipped synchronously in the handler.
 *
 * It is released in `.finally`, and that is load-bearing. An earlier version set
 * the latch here and cleared it inside the valid-submit callback — which never
 * runs when validation fails, so one mismatched password left a sign-up form
 * permanently dead. `handleSubmit(...)(event)` settles on EVERY path, valid or
 * not, so the release cannot be skipped.
 *
 * Shared because three forms in two features carried the same eleven lines, and a
 * fourth copy is where the `.finally` gets forgotten (PD-01, STRUCT-05).
 */
export function useLatchedSubmit<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  onValid: SubmitHandler<TValues>,
): (event: FormEvent<HTMLFormElement>) => void {
  const inFlight = useRef(false);

  return (event) => {
    if (inFlight.current) {
      event.preventDefault();
      return;
    }

    inFlight.current = true;
    void form
      .handleSubmit(onValid)(event)
      .finally(() => {
        inFlight.current = false;
      });
  };
}
