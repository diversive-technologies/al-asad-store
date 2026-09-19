import { Fragment } from 'react';

import Link from 'next/link';

import { cn } from '@/lib/utils/cn';

/** One step of the trail. The last step is the page itself and carries no link. */
export interface BreadcrumbStep {
  readonly label: string;
  /** Absent on the current page, which is named but not linked. */
  readonly href?: string;
}

export interface BreadcrumbTrailProps {
  /** The trail's accessible name, from SSOT-07 — the same one on every page. */
  label: string;
  steps: readonly BreadcrumbStep[];
  className?: string;
}

/**
 * Section 30.5's breadcrumbs as a reader sees them, written once (PD-01).
 * `Breadcrumbs` adds the structured data on an indexable page; this is the trail
 * alone, which is what a Client Component draws.
 *
 * Why it is its own module (PERF-10): the structured data resolves addresses
 * against the app URL, and `env.client.ts` validates that URL with Zod. A Client
 * Component importing `Breadcrumbs` therefore put Zod — about 84 kB gzipped — in
 * its route's first load: the studio's went from 196.5 kB to 280 kB for a trail of
 * two links. Nothing here reaches the environment.
 *
 * `py-2` on a link grows the TARGET without moving the page: vertical padding on
 * an inline box is hit-tested but does not change the line box, so a 17px link
 * becomes a 33px one in place. The row gap has to clear twice that padding, or a
 * wrapped trail would have the line above stealing taps from the line below; it
 * only ever applies when the trail actually wraps.
 *
 * A11Y-01: a real `nav` holding an ordered list, named as a breadcrumb rather
 * than after the page it sits on, with the current page marked as such.
 */
export function BreadcrumbTrail({ label, steps, className }: BreadcrumbTrailProps) {
  return (
    <nav aria-label={label} className={cn('text-fg-muted mb-4 text-sm', className)}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-4">
        {steps.map((step, index) => (
          // CMP-10: a trail never links one address twice, and only the current
          // page has none — so the address is a stable key where a label may not be.
          <Fragment key={step.href ?? 'current'}>
            {index === 0 ? null : <li aria-hidden>/</li>}
            {step.href === undefined ? (
              <li aria-current="page" className="text-fg">
                {step.label}
              </li>
            ) : (
              <li>
                <Link href={step.href} className="hover:text-fg py-2">
                  {step.label}
                </Link>
              </li>
            )}
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
