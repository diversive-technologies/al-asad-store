import { cva, type VariantProps } from 'class-variance-authority';

/**
 * SSOT-10 — visual variants are declared once, here, never as conditional class
 * soup at call sites. CMP-07: one `variant` union, not a boolean per style.
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-card font-medium transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ' +
    'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-brand-600 text-on-brand hover:bg-brand-500',
        secondary: 'bg-surface-muted text-fg hover:bg-surface-strong',
        destructive: 'bg-danger-500 text-on-brand hover:opacity-90',
        ghost: 'bg-transparent text-fg hover:bg-surface-muted',
        /* For a button ON a brand ground. `secondary` is surface+fg, and both
           invertfor dark while the brand ramp does not, so that variant renders
           as a dark grey box on the jade band in dark mode. Existing tokens
           only; neither side of this pair is redefined for dark. */
        onBrand: 'bg-on-brand text-brand-700 hover:bg-brand-50',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
