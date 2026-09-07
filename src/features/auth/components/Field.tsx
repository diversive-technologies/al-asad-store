import type { ReactNode } from 'react';

/** Exactly what an input needs to satisfy FORM-05, handed to it by `Field`. */
export interface FieldAria {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
}

export interface FieldProps {
  id: string;
  label: string;
  /** Already-resolved copy, or undefined when the field is valid. */
  error?: string | undefined;
  hint?: string | undefined;
  children: (aria: FieldAria) => ReactNode;
}

/**
 * One labelled field with its error wired to the input.
 *
 * FORM-05 requires a programmatically associated `<label>`, plus `aria-invalid`
 * and `aria-describedby` pointing at the message. Six forms repeating that by
 * hand is six chances to miss one.
 *
 * The child is a FUNCTION rather than an element, and that is the load-bearing
 * part: a component cannot set attributes on children it merely receives, so an
 * earlier version of this promised the wiring and silently left every input
 * without it. Handing the attributes down makes forgetting them impossible.
 */
export function Field({ id, label, error, hint, children }: FieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy = [hint === undefined ? null : hintId, error === undefined ? null : errorId]
    .filter((value): value is string => value !== null)
    .join(' ');

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-fg text-sm">
        {label}
      </label>

      {children({
        id,
        'aria-invalid': error !== undefined,
        'aria-describedby': describedBy.length === 0 ? undefined : describedBy,
      })}

      {hint === undefined ? null : (
        <p id={hintId} className="text-fg-muted text-xs">
          {hint}
        </p>
      )}

      {error === undefined ? null : (
        <p id={errorId} role="alert" className="text-danger-500 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
