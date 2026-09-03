import Image from 'next/image';

import { ButtonLink } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

import type { EditorialBannerSection as EditorialBannerSectionData } from '../schemas/homepage.schema';

export interface EditorialBannerSectionProps {
  section: EditorialBannerSectionData;
}

/**
 * Image beside copy.
 *
 * `imageSide` is logical, so `end` means "the side the reader finishes on" —
 * visually right in English and left in Urdu. Expressed with flex `order`
 * rather than a physical float, the browser mirrors it from `dir` with no
 * conditional (I18N-04).
 */
export function EditorialBannerSection({ section }: EditorialBannerSectionProps) {
  return (
    <section className="p-gutter grid gap-6 md:grid-cols-2 md:items-center">
      <div
        className={cn(
          'rounded-card bg-surface-muted relative aspect-[3/2] overflow-hidden',
          section.imageSide === 'end' ? 'md:order-2' : 'md:order-1',
        )}
      >
        <Image
          src={section.imageUrl}
          alt=""
          aria-hidden
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      </div>

      <div
        className={cn(
          'flex flex-col items-start gap-3 text-start',
          section.imageSide === 'end' ? 'md:order-1' : 'md:order-2',
        )}
      >
        <h2 className="text-fg text-xl font-semibold">{section.heading}</h2>
        <p className="text-fg-muted">{section.body}</p>
        <ButtonLink href={section.cta.href} variant="secondary">
          {section.cta.label}
        </ButtonLink>
      </div>
    </section>
  );
}
