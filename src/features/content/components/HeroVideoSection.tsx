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
 *
 * `-mt-header` pulls the section up under the fixed bar so the film starts at
 * the very top of the viewport, while `main` keeps its padding for every other
 * page. Full-bleed is opt-in; clearing the bar is the default.
 *
 * The section deliberately does NOT clip. Clipping lives on the film stage,
 * which is what needs it; hoisting it here would cut off the ambient glow at
 * exactly the edge it is supposed to spill past.
 */
export function HeroVideoSection({ section }: HeroVideoSectionProps) {
  return (
    <section
      data-hero
      className="bg-media-band hero-frame -mt-header relative isolate flex items-end"
    >
      <HeroMedia poster={section.poster} video={section.video} />

      {/*
       * The copy is held to the same max width as the header, and centred.
       * On a viewport wide enough to show bands, that keeps every word over
       * footage rather than over the page background, where light-on-media text
       * would be unreadable in the light theme.
       */}
      <div className="page-shell pb-16">
        <div className="flex max-w-xl flex-col items-start gap-4 text-start">
          <h1 className="text-on-media text-3xl font-semibold sm:text-5xl">{section.headline}</h1>
          <p className="text-on-media/90">{section.subheadline}</p>
          <ButtonLink href={section.cta.href} variant="primary" size="lg">
            {section.cta.label}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
