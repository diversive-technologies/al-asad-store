import type { InputHTMLAttributes, Ref } from 'react';

import { cn } from '@/lib/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** React 19 passes `ref` as an ordinary prop; `forwardRef` is deprecated. */
  ref?: Ref<HTMLInputElement>;
}

/**
 * CMP-12 — `className` is merged last so consumers can adjust layout without
 * forking. STY-10 — the focus ring is part of the primitive, not something each
 * form remembers to add.
 *
 * I18N-04: `px-3` and `text-start` are direction-agnostic; the caret and text
 * alignment follow `dir` with no second code path.
 */
export function Input({ className, ref, ...rest }: InputProps) {
  return (
    <input
      ref={ref}
      className={cn(
        'rounded-card border-border bg-surface text-fg h-10 w-full border px-3 text-start text-sm',
        'placeholder:text-fg-muted',
        'focus-visible:ring-brand-500 focus-visible:ring-2 focus-visible:outline-none',
        'aria-[invalid=true]:border-danger-500',
        className,
      )}
      {...rest}
    />
  );
}
