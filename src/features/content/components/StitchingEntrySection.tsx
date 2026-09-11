import { ButtonLink } from '@/components/ui/button';
/* STRUCT-04: through a barrel, never into another feature's internals. The
   static-only `contract` barrel keeps `MeasurementStudio`'s client boundary off
   the homepage. */
import { GarmentMark } from '@/features/made-to-measure/contract';
import type { Locale } from '@/i18n/locales';
import { formatNumber } from '@/lib/utils/format';

import type { StitchingEntrySection as StitchingEntrySectionData } from '../schemas/homepage.schema';

export interface StitchingEntrySectionProps {
  section: StitchingEntrySectionData;
  locale: Locale;
}

/**
 * §34's homepage stage — the route into Made-to-Measure, directly under the hero.
 *
 * THE SECTION'S PICTURE IS THE STORE'S OWN DRAWING. It was a stock 4:5
 * photograph in a rounded card, which is the most generic thing this band could
 * have worn; it is now the studio's own garment patterns, hung side by side from
 * the shoulder line, each carrying one gold ring where the tape goes. Nobody else
 * can buy that image, and it states the service without a word of copy.
 *
 * The eyebrow is gone, at the contract level rather than in the markup: a kicker
 * above a heading is banned outright, and a schema that still demands one invites
 * the next operator to write it back.
 *
 * `brand-700` rather than `brand-600`: white line art has more room on a darker
 * ground, and the body tint and the gold numerals both gain real contrast
 * headroom instead of sitting near the floor. It also makes this the darkest band
 * on the homepage — the one band that is not photography.
 */
export function StitchingEntrySection({ section, locale }: StitchingEntrySectionProps) {
  return (
    <section aria-labelledby={section.id} className="stitching-stage bg-brand-700 text-on-brand">
      <div className="page-shell flex flex-col items-center gap-8 py-14 md:gap-16 md:py-24">
        <div className="flex w-full max-w-3xl flex-col items-start">
          {/* A11Y-09: sequential under the page's single h1. It carries the weight
              the kicker was borrowing — one step below the hero's own scale, which
              is where the page's second-loudest thing belongs. */}
          <h2
            id={section.id}
            className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl"
          >
            {section.heading}
          </h2>

          {/* Alpha on the TOKEN, not `opacity` on the element: opacity dims every
              descendant, and secondary text on a coloured ground has to be tinted
              from that ground's own foreground rather than from grey. */}
          <p className="text-on-brand/90 mt-5 max-w-prose">{section.body}</p>

          {/*
           * A11Y-11: an ordered list, because order is their content. The
           * numbering is argued rather than assumed — you cannot measure a garment
           * you have not laid flat, and the workshop cannot cut before you have
           * measured, so the sequence IS the rebuttal to the objection the
           * customer actually has ("surely this needs an appointment").
           *
           * The bordered pill around each digit was a container drawn round a
           * numeral. The figure is set as type instead, in the same gold the rings
           * on the drawings below are stroked in.
           */}
          <ol className="mt-8 flex w-full flex-col gap-6 sm:flex-row sm:gap-8 md:mt-12">
            {section.steps.map((step, index) => (
              // CMP-10: the step's own text is its stable identity.
              <li key={step} className="flex flex-1 items-baseline gap-4">
                {/* I18N-08: a figure, so it goes through the locale formatter. */}
                <span
                  aria-hidden
                  className="text-accent-400 shrink-0 text-xl font-semibold tabular-nums"
                >
                  {formatNumber(index + 1, locale)}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          {/* `secondary` is `bg-surface-muted text-fg`, and both of those invert
              for dark while the brand ramp does not — so on this band that variant
              renders as a dark grey box in dark mode. */}
          <ButtonLink href={section.cta.href} variant="onBrand" size="lg" className="mt-8 md:mt-12">
            {section.cta.label}
          </ButtonLink>
        </div>

        {/*
         * A11Y-04: decorative. The heading, the steps and the button already say
         * where this goes, and the drawings repeat in line what the body states in
         * words — a kameez, shalwar or waistcoat you already own.
         *
         * Below 48rem only the kameez is drawn: three flats in a phone's column is
         * roughly 106px each, which is the sub-pixel failure that keeps the drawing
         * off the header entirely.
         */}
        <div aria-hidden className="garment-rail">
          <div>
            <GarmentMark garment="KAMEEZ" />
          </div>
          <div className="hidden md:block">
            <GarmentMark garment="SHALWAR" />
          </div>
          <div className="hidden md:block">
            <GarmentMark garment="WAISTCOAT" />
          </div>
        </div>
      </div>
    </section>
  );
}
