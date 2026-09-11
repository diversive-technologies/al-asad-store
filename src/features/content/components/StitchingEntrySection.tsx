import Image from 'next/image';

import { ButtonLink } from '@/components/ui/button';

import type { StitchingEntrySection as StitchingEntrySectionData } from '../schemas/homepage.schema';

export interface StitchingEntrySectionProps {
  section: StitchingEntrySectionData;
}

/** PERF-07: second on the page, so it is sized honestly rather than prioritised. */
const IMAGE_SIZES = '(min-width: 768px) 40vw, 90vw';

/**
 * §34's homepage stage — the route into Made-to-Measure, directly under the hero.
 *
 * The loudest band on the page after the film, on purpose: a jade ground with
 * the page's lightest text, where every other section sits on the surface. The
 * button is the SECONDARY variant for the plain reason that a primary jade
 * button on a jade band disappears.
 *
 * The three steps are what earn the click. Somebody who has never ordered
 * stitching online assumes a fitting appointment; three things they can do on a
 * bed is the news. They are an ordered list because order is their content
 * (A11Y-11), and the numerals are drawn beside them rather than announced twice.
 *
 * The photograph is decorative, as the catalogue entry's stills are: the
 * heading, steps and button already say where this goes (A11Y-04).
 */
export function StitchingEntrySection({ section }: StitchingEntrySectionProps) {
  return (
    <section aria-labelledby={section.id} className="bg-brand-600 text-on-brand">
      <div className="page-shell grid items-center gap-10 py-16 md:grid-cols-2">
        <div className="flex flex-col items-start gap-5">
          <p className="text-xs font-medium tracking-widest uppercase opacity-80">
            {section.eyebrow}
          </p>
          {/* A11Y-09: sequential under the page's single h1. */}
          <h2 id={section.id} className="text-3xl font-semibold text-balance">
            {section.heading}
          </h2>
          <p className="max-w-prose opacity-90">{section.body}</p>

          <ol className="flex flex-col gap-3">
            {section.steps.map((step, index) => (
              // CMP-10: the step's own text is its stable identity.
              <li key={step} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="rounded-pill grid size-7 shrink-0 place-items-center border border-current text-sm"
                >
                  {String(index + 1)}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>

          <ButtonLink href={section.cta.href} variant="secondary" size="lg">
            {section.cta.label}
          </ButtonLink>
        </div>

        <div aria-hidden className="rounded-card relative aspect-4/5 overflow-hidden">
          <Image src={section.imageUrl} alt="" fill sizes={IMAGE_SIZES} className="object-cover" />
        </div>
      </div>
    </section>
  );
}
