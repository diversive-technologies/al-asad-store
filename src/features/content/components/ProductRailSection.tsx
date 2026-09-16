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
    <section className="page-shell flex flex-col gap-4 py-12">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="text-fg text-xl font-semibold">{section.title}</h2>
        {/*
         * `py-2` grows the tap target from 20px to 36px — it sits above a rail
         * people swipe, where a near-miss scrolls the rail instead.
         *
         * `-my-2` is what keeps the header where it was. This link is a direct
         * child of a flex container, so it is BLOCKIFIED and its vertical
         * padding is real layout rather than the free hit area that the same
         * padding buys on an inline breadcrumb: without the negative margin the
         * header grows 8px and the heading's baseline shifts with it, on rails
         * that have a link and not on rails that do not.
         */}
        <Link
          href={section.viewAllHref}
          className="text-fg-muted hover:text-fg -my-2 py-2 text-sm underline underline-offset-4"
        >
          {messages.common.viewAll}
        </Link>
      </header>

      <ul
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3"
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
