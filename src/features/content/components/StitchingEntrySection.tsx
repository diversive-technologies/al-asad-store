import { ButtonLink } from '@/components/ui/button';
/* STRUCT-04: through a barrel, never into another feature's internals. The
   static-only `contract` barrel keeps `MeasurementStudio`'s client boundary off
   the homepage. */
import { GarmentMark } from '@/features/made-to-measure/contract';
import type { Locale } from '@/i18n/locales';

import type { StitchingEntrySection as StitchingEntrySectionData } from '../schemas/homepage.schema';
import { StitchingEntrySteps } from './StitchingEntrySteps';

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
 *
 * In the markup, in order:
 *
 * - A11Y-09: the `h2` is sequential under the page's single h1. It carries the
 *   weight the kicker was borrowing — one step below the hero's own scale, which
 *   is where the page's second-loudest thing belongs.
 * - The body's tint is alpha on the TOKEN, not `opacity` on the element: opacity
 *   dims every descendant, and secondary text on a coloured ground has to be
 *   tinted from that ground's own foreground rather than from grey.
 * - The button is `onBrand`, because `secondary` is `bg-surface-muted text-fg`,
 *   both of which invert for dark while the brand ramp does not — so on this band
 *   that variant renders as a dark grey box in dark mode.
 * - A11Y-04: the drawings are decorative. The heading, the steps and the button
 *   already say where this goes. Below 48rem only the kameez is drawn: three flats
 *   in a phone's column is roughly 106px each, the sub-pixel failure that keeps
 *   the drawing off the header entirely.
 */
export function StitchingEntrySection({ section, locale }: StitchingEntrySectionProps) {
  return (
    <section aria-labelledby={section.id} className="stitching-stage bg-brand-700 text-on-brand">
      <div className="page-shell flex flex-col items-center gap-8 py-14 md:gap-16 md:py-24">
        <div className="flex w-full max-w-3xl flex-col items-start">
          <h2
            id={section.id}
            className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl"
          >
            {section.heading}
          </h2>

          <p className="text-on-brand/90 mt-5 max-w-prose">{section.body}</p>

          <StitchingEntrySteps steps={section.steps} locale={locale} />

          <ButtonLink href={section.cta.href} variant="onBrand" size="lg" className="mt-8 md:mt-12">
            {section.cta.label}
          </ButtonLink>
        </div>

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
