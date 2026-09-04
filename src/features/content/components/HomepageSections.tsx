import { mergeAvailability, type ProductAvailability } from '@/features/catalogue';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { assertNever } from '@/lib/result';

import type { HomepageSection } from '../schemas/homepage.schema';
import { CatalogueEntrySection } from './CatalogueEntrySection';
import { CategoryGridSection } from './CategoryGridSection';
import { EditorialBannerSection } from './EditorialBannerSection';
import { HeroVideoSection } from './HeroVideoSection';
import { ProductRailSection } from './ProductRailSection';

export interface HomepageSectionsProps {
  sections: readonly HomepageSection[];
  availabilities: readonly ProductAvailability[];
  locale: Locale;
  messages: Messages;
}

/**
 * Renders whatever the Content module configured, in the order it configured
 * it. Adding, removing or reordering a section is an operator change; only a
 * new *kind* reaches this file.
 *
 * TS-07: the switch is exhaustive over a closed union with an `assertNever`
 * default, so introducing a kind in the schema without a renderer is a compile
 * error rather than a silently blank slot on the homepage.
 */
export function HomepageSections({
  sections,
  availabilities,
  locale,
  messages,
}: HomepageSectionsProps) {
  return (
    <>
      {sections.map((section) => {
        switch (section.kind) {
          case 'HERO_VIDEO':
            return <HeroVideoSection key={section.id} section={section} />;

          case 'PRODUCT_RAIL':
            return (
              <ProductRailSection
                key={section.id}
                section={section}
                entries={mergeAvailability(section.products, availabilities)}
                locale={locale}
                messages={messages}
              />
            );

          case 'CATEGORY_GRID':
            return <CategoryGridSection key={section.id} section={section} />;

          case 'EDITORIAL_BANNER':
            return <EditorialBannerSection key={section.id} section={section} />;

          case 'CATALOGUE_ENTRY':
            return <CatalogueEntrySection key={section.id} section={section} />;

          default:
            return assertNever(section);
        }
      })}
    </>
  );
}
