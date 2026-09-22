import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';
import { formatNumber, formatTemplate } from '@/lib/utils/format';
import { ChevronRight, Ruler } from '@/lib/vendor/icons';

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
 * THE STORE'S USP, SO IT IS SEEN AT ONCE — the operator's call. It was an
 * underlined text link under a small heading, and a customer scanning the buy box
 * read past it. It is now a full-width GOLD button the height of Add to bag, drawn
 * as a tailor's tape (`measure-button`: the tape's graduations along its edge and
 * a slow band of light across it). Gold is the studio's own mark and the header's
 * "Stitched to size", and jade still means "this takes money", so the two buttons
 * say different things at a glance.
 *
 * Still NOT a card: no border, no padding, no box around the block. What the eye
 * finds is the button itself.
 *
 * The whole block stays ONE link (A11Y-01 — it goes somewhere, so it is not a
 * `<button>`): the heading, the gold button and the sentence under it read to a
 * screen reader as one name, starting with the heading, and a phone gets a
 * generous target. The "button" is a span wearing the button's variant, because a
 * link inside a link is invalid.
 */
export function StitchingFork({ offer, slug, locale, messages }: StitchingForkProps) {
  const t = messages.product;

  return (
    /* Straight to the list for the style this product is cut as — carrying the
       PRODUCT as well, so the studio can say which garment is being measured for,
       send the customer back to it, and put it in the bag at the end. */
    <Link
      href={ROUTES.stitchedWith({ style: offer.garmentStyle, source: null, product: slug })}
      className="group rounded-card flex flex-col gap-2"
    >
      <span className="text-fg text-sm font-medium">{t.stitchingForkHeading}</span>

      <span
        className={cn(
          buttonVariants({ variant: 'accent', size: 'lg' }),
          'measure-button group-hover:bg-accent-500 w-full gap-2 font-semibold',
        )}
      >
        {/* A11Y-04: decorative beside the words. I18N-05: a ruler does not point,
            so it does not mirror; the chevron does, so it turns under RTL. */}
        <Ruler aria-hidden className="size-5" />
        {t.stitchingForkCta}
        <ChevronRight aria-hidden className="size-4 rtl:rotate-180" />
      </span>

      <span className="text-fg-muted text-center text-xs">
        {/* I18N-06 / I18N-08: one parameterised sentence, its number formatted. */}
        {formatTemplate(t.stitchingForkBody, {
          days: formatNumber(offer.leadTimeDays, locale),
        })}
      </span>
    </Link>
  );
}
