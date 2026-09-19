export interface AuthRefusalProps {
  /** Resolved copy (ERR-11), or `null` while there is nothing to say. */
  message: string | null;
}

/**
 * Why an authentication step did not go through, beside the form that asked.
 *
 * A11Y-05 / ERR-04: announced, not only shown. Every auth form carries one, so
 * the markup lives once (PD-01).
 */
export function AuthRefusal({ message }: AuthRefusalProps) {
  if (message === null) return null;

  return (
    <p role="alert" className="text-danger-500 text-sm">
      {message}
    </p>
  );
}
