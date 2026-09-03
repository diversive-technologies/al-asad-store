import type { Ref } from 'react';

import Link from 'next/link';

import { cn } from '@/lib/utils/cn';

import { buttonVariants, type ButtonVariants } from './button.variants';

export interface ButtonLinkProps extends ButtonVariants {
  href: string;
  children: React.ReactNode;
  className?: string;
  ref?: Ref<HTMLAnchorElement>;
}

/**
 * A navigation control that looks like a button.
 *
 * A11Y-01: a link that navigates is an `<a>`, never a `<button>` with an
 * onClick — it must open in a new tab, be copied, and be announced as a link.
 * SSOT-10: the styling comes from the same CVA variants the Button uses, so the
 * two can never drift. NEXT-08: internal navigation goes through `next/link`.
 */
export function ButtonLink({ href, children, className, variant, size, ref }: ButtonLinkProps) {
  return (
    <Link ref={ref} href={href} className={cn(buttonVariants({ variant, size }), className)}>
      {children}
    </Link>
  );
}
