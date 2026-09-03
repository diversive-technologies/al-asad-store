import Link from 'next/link';

import { ProductCard, type ProductCardWithAvailability } from '@/features/catalogue';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';

import type { ProductRailSection as ProductRailSectionData } from '../schemas/homepage.schema';

export interface ProductRailSectionProps {
  section: ProductRailSectionData;
  entries: readonly ProductCardWithAvailability[];
  locale: Locale;
  messages: Messages;
}

/**
 * STRUCT-04 — the card comes from the catalogue feature's public barrel, so the
 * homepage and the listing pages can never render two different cards.
 *
 * The rail scrolls horizontally with `overflow-x-auto`, which follows `dir`
 * automatically: in Urdu the first product sits at the right and the scroll
 * runs the other way, with no second code path (I18N-04).
 */
export function ProductRailSection({
  section,
  entries,
  locale,
  messages,
}: ProductRailSectionProps) {
  if (entries.length === 0) return null;

  return (
    <section className="p-gutter flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="text-fg text-xl font-semibold">{section.title}</h2>
        <Link
          href={section.viewAllHref}
          className="text-fg-muted hover:text-fg text-sm underline underline-offset-4"
        >
          {messages.common.viewAll}
        </Link>
      </header>

      <ul
        className="-mx-gutter px-gutter flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
        aria-label={section.title}
      >
        {entries.map((entry, index) => (
          // CMP-10: a stable, domain-derived key.
          <li key={entry.product.id} className="w-44 shrink-0 snap-start sm:w-56">
            <ProductCard
              entry={entry}
              locale={locale}
              messages={messages}
              hasPriorityImage={index === 0}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
