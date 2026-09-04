import Image from 'next/image';

import { ButtonLink } from '@/components/ui/button';

import type { CatalogueEntrySection as CatalogueEntrySectionData } from '../schemas/homepage.schema';

export interface CatalogueEntrySectionProps {
  section: CatalogueEntrySectionData;
}

/** PERF-07: below the fold, so the stills load lazily and are sized honestly. */
const PREVIEW_SIZES = '(min-width: 768px) 12rem, 40vw';

/**
 * The homepage's route into the full catalogue.
 *
 * This carries the weight the header's Catalogue link used to, so it is
 * deliberately louder than the editorial banner beside it: a filled primary
 * button rather than a text link, on its own tinted band.
 *
 * The preview stills are decorative and say so — `alt=""` with `aria-hidden`.
 * A screen reader gains nothing from four unnamed fabric photographs, and the
 * heading, body and button already describe where the section goes (A11Y-04).
 */
export function CatalogueEntrySection({ section }: CatalogueEntrySectionProps) {
  return (
    <section aria-labelledby={section.id} className="bg-surface-muted">
      <div className="page-shell grid items-center gap-8 py-14 md:grid-cols-2">
        <div className="flex flex-col items-start gap-4">
          {/* A11Y-09: sequential under the page's single h1. */}
          <h2 id={section.id} className="text-fg text-2xl font-semibold text-balance">
            {section.heading}
          </h2>
          <p className="text-fg-muted max-w-prose">{section.body}</p>
          <ButtonLink href={section.cta.href} size="lg">
            {section.cta.label}
          </ButtonLink>
        </div>

        {section.previewImageUrls.length === 0 ? null : (
          <div className="grid grid-cols-4 gap-2" aria-hidden>
            {section.previewImageUrls.map((url) => (
              // CMP-10: the asset URL is the stable key for a decorative still.
              <div
                key={url}
                className="rounded-card bg-surface-strong relative aspect-[3/4] overflow-hidden"
              >
                <Image src={url} alt="" fill sizes={PREVIEW_SIZES} className="object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
