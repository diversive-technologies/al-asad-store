import { Check } from '@/lib/vendor/icons';

export interface OrderPlacedHeroProps {
  title: string;
  orderNumberLabel: string;
  orderNumber: string;
  placedLabel: string;
  placedAt: string;
}

/**
 * The moment the order lands.
 *
 * **No `'use client'`, and no JavaScript at all.** The first version animated
 * this with `motion`, and it rendered an INVISIBLE confirmation page: motion
 * writes the `initial` styles into the server HTML, so until the leaf hydrates
 * the heading and the order number sit at `opacity: 0`. On a page whose whole
 * job is to tell someone their order exists, "invisible until hydration
 * finishes" is not a trade worth making for a flourish.
 *
 * So the rule here is: **nothing the customer needs to read is animated.** The
 * text is plain, visible, server-rendered markup. What animates is decoration —
 * the ring and the tick — through CSS, which needs no hydration and no bundle,
 * and which `globals.css` disables under `prefers-reduced-motion` (A11Y-10).
 */
export function OrderPlacedHero({
  title,
  orderNumberLabel,
  orderNumber,
  placedLabel,
  placedAt,
}: OrderPlacedHeroProps) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* A11Y-04: the heading below names this; the mark is decoration. */}
      <div className="order-placed-mark" aria-hidden>
        <Check className="order-placed-tick" strokeWidth={3} />
      </div>

      <h1 className="text-fg mt-6 text-3xl font-semibold">{title}</h1>

      <div className="border-border rounded-card mt-6 w-full max-w-sm border p-5">
        <p className="text-fg-muted text-xs tracking-wide uppercase">{orderNumberLabel}</p>
        {/*
         * The largest text on the page. §28.3 tracks a guest order by this plus
         * the mobile number, so it is the one thing worth remembering.
         */}
        <p className="text-fg text-3xl font-semibold tracking-wider">{orderNumber}</p>
        <p className="text-fg-muted mt-2 text-xs">
          {placedLabel}: {placedAt}
        </p>
      </div>
    </div>
  );
}
