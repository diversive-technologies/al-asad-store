import type { ButtonHTMLAttributes, Ref } from 'react';

import { cn } from '@/lib/utils/cn';
import { Loader2 } from '@/lib/vendor/icons';

import { buttonVariants, type ButtonVariants } from './button.variants';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariants {
  /** In flight AND disabled — for a control with nothing else refusing a second press. */
  isLoading?: boolean;
  /**
   * In flight and still ENABLED: `aria-busy` and the spinner, but the button keeps
   * the keyboard focus it holds, which a disabled one drops (§30.3). For a control
   * whose handler already refuses a second press with a synchronous latch.
   */
  isBusy?: boolean;
  /** React 19 passes `ref` as an ordinary prop; `forwardRef` is deprecated. */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * CMP-14 — reference UI primitive. No `'use client'`: it holds no state and
 * registers no handler of its own, so it renders in a Server Component and only
 * becomes part of a client bundle when a client parent passes one (MOD-06).
 */
export function Button({
  ref,
  className,
  variant,
  size,
  isLoading = false,
  isBusy = false,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const inFlight = isLoading || isBusy;

  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled === true || isLoading}
      aria-busy={inFlight}
      {...rest}
    >
      {/* I18N-04: logical `me-2`, not physical `mr-2` — the spinner sits before
          the label in both directions. */}
      {inFlight ? <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
