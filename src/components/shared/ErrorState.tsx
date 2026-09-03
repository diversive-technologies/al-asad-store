import { cn } from '@/lib/utils/cn';

export interface ErrorStateProps {
  /** ERR-11: resolved copy from SSOT-07. A backend `message` is never passed here. */
  message: string;
  className?: string;
}

/** SEC-07 — no raw error internals, status codes or stack traces reach the user. */
export function ErrorState({ message, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-card border border-border bg-surface-muted p-gutter text-start text-fg',
        className,
      )}
    >
      {message}
    </div>
  );
}
