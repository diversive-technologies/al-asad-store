import Link from 'next/link';

import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatNumber, formatTemplate } from '@/lib/utils/format';
import { ChevronRight } from '@/lib/vendor/icons';

import type { StitchingOffer } from '../schemas/product-detail.schema';

export interface StitchingForkProps {
  offer: StitchingOffer;
  /** The product this fork is on — it travels into the studio and back out. */
  slug: string;
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
 * §34.7: standard-size purchase is never removed. This is an additional path, so
 * it sits below the selector and the bag button, never in place of them.
 *
 * IT IS NOT A CARD. It lives in a column of flat blocks — a buy box with no
 * container of its own, and a delivery list whose only edge is a 1px rule — so a
 * bordered, radiused, padded box with a filled disc in it was a sticker applied
 * to the page rather than a row of it. The border, the radius, the padding and
 * the disc are gone; what marks it now is the measure line, which is the studio's
 * own measurement ring unrolled straight. The column then reads as three line
 * weights, each meaning something different, and not one box.
 *
 * The whole block is one link (A11Y-01 — it goes somewhere, so it is not a
 * button). That makes a generous target on a phone, and reads to a screen reader
 * as one sentence rather than a heading, a paragraph and a detached "go".
 */
export function StitchingFork({ offer, slug, locale, messages }: StitchingForkProps) {
  const t = messages.product;

  return (
    /* Straight to the list for the style this product is cut as — carrying the
       PRODUCT as well, so the studio can say which garment is being measured for,
       send the customer back to it, and put it in the bag at the end. */
    <Link
      href={ROUTES.stitchedWith({ style: offer.garmentStyle, source: null, product: slug })}
      className="group rounded-card flex flex-col items-start gap-4"
    >
      {/* The measure line: `ellipse.gf-mark` unrolled. The studio marks a
          measurement with a 1px gold ellipse dashed 4 on, 3.5 off; off the studio
          the same mark goes straight. It REPLACES the border rather than
          decorating one, and the bag nudge carries the identical mark. */}
      <span aria-hidden className="measure-line" />

      <span className="flex flex-col items-start gap-1">
        <span className="text-fg text-sm font-medium">{t.stitchingForkHeading}</span>

        <span className="text-fg-muted text-xs">
          {/* I18N-06 / I18N-08: one parameterised sentence, its number formatted. */}
          {formatTemplate(t.stitchingForkBody, {
            days: formatNumber(offer.leadTimeDays, locale),
          })}
        </span>

        {/* `text-brand-600` measured 2.82:1 against the dark surface — a real
            A11Y-07 failure at 12px. `text-fg` plus an underline carries "link" in
            both themes, and collapses three divergent link styles into the one
            `ProductRailSection` already owns. The chevron joins the sentence
            rather than sitting pinned to the far edge, where it was a second,
            competing "go". */}
        <span className="text-fg mt-1 inline-flex items-center gap-1 text-xs font-medium underline decoration-1 underline-offset-4">
          {t.stitchingForkCta}
          {/* I18N-05: directional, so it mirrors under RTL. */}
          <ChevronRight aria-hidden className="size-3.5 rtl:rotate-180" />
        </span>
      </span>
    </Link>
  );
}
