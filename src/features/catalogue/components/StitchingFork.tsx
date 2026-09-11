import Link from 'next/link';

import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatNumber, formatTemplate } from '@/lib/utils/format';
import { ChevronRight, Ruler } from '@/lib/vendor/icons';

import type { StitchingOffer } from '../schemas/product-detail.schema';

export interface StitchingForkProps {
  offer: StitchingOffer;
  locale: Locale;
  messages: Messages;
}

/**
 * §34's fork in the buy box: this same product, cut to the customer's own fit.
 *
 * It sits directly under Add to bag, not further down the page, because that is
 * where the size decision is made — the customer who cannot find their size in
 * the selector is exactly who this is for, and they are looking HERE.
 *
 * §34.7: standard-size purchase is never removed. This is an additional path,
 * so it sits below the selector and the bag button, never in place of them.
 *
 * The whole card is one link (A11Y-01 — it goes somewhere, so it is not a
 * button). That makes a generous target on a phone, and reads to a screen reader
 * as one sentence rather than a heading, a paragraph and a detached "go".
 */
export function StitchingFork({ offer, locale, messages }: StitchingForkProps) {
  const t = messages.product;

  return (
    <Link
      href={ROUTES.stitched}
      className="border-border hover:border-brand-500 rounded-card focus-visible:ring-brand-500 flex items-center gap-4 border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <span
        aria-hidden
        className="bg-brand-600 text-on-brand rounded-pill grid size-10 shrink-0 place-items-center"
      >
        <Ruler className="size-5" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-fg text-sm font-medium">{t.stitchingForkHeading}</span>
        <span className="text-fg-muted text-xs">
          {/* I18N-06 / I18N-08: one parameterised sentence, its number formatted. */}
          {formatTemplate(t.stitchingForkBody, {
            days: formatNumber(offer.leadTimeDays, locale),
          })}
        </span>
        <span className="text-brand-600 mt-1 text-xs font-medium">{t.stitchingForkCta}</span>
      </span>

      {/* I18N-05: directional, so it mirrors under RTL. */}
      <ChevronRight aria-hidden className="text-fg-muted size-4 shrink-0 rtl:rotate-180" />
    </Link>
  );
}
