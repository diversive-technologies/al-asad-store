import { ButtonLink } from '@/components/ui/button';

import type { HeroVideoSection as HeroVideoSectionData } from '../schemas/homepage.schema';
import { HeroMedia } from './HeroMedia';

export interface HeroVideoSectionProps {
  section: HeroVideoSectionData;
}

/**
 * The hero. Everything except the backdrop is a Server Component: the headline,
 * the supporting line and the call to action are all in the initial HTML, so
 * the section is readable and clickable before any JavaScript runs.
 */
export function HeroVideoSection({ section }: HeroVideoSectionProps) {
  return (
    <section className="relative isolate flex min-h-[70vh] items-end overflow-hidden">
      <HeroMedia poster={section.poster} video={section.video} />

      {/* Scrim keeps A11Y-07 contrast over an arbitrary editorial still. */}
      <div className="bg-media-scrim/50 absolute inset-0 -z-10" aria-hidden />

      <div className="p-gutter flex max-w-xl flex-col items-start gap-4 pb-12 text-start">
        <h1 className="text-on-media text-3xl font-semibold sm:text-5xl">{section.headline}</h1>
        <p className="text-on-media/90">{section.subheadline}</p>
        <ButtonLink href={section.cta.href} variant="primary" size="lg">
          {section.cta.label}
        </ButtonLink>
      </div>
    </section>
  );
}
