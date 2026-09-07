export interface OrderPlacedHeroProps {
  title: string;
  orderNumberLabel: string;
  orderNumber: string;
  placedLabel: string;
  placedAt: string;
}

/** The burst rays. Eight is enough to read as a burst without becoming a star. */
const RAYS = [0, 1, 2, 3, 4, 5, 6, 7];

/**
 * The moment the order lands.
 *
 * **No `'use client'`, and no JavaScript at all.** An earlier version animated
 * this with `motion` and rendered an INVISIBLE confirmation page: motion writes
 * its `initial` styles into the server HTML, so until the leaf hydrated the
 * heading and the order number sat at `opacity: 0`. On the one page whose job
 * is to tell someone their order exists, that is not a trade worth making.
 *
 * So the rule is: **nothing the customer needs to read is animated.** The text
 * is plain, server-rendered markup. What moves is the mark, and it moves the
 * way a Lottie of this kind does — a ring drawing itself around the disc, the
 * tick stroking on after it, and a burst opening outward as it lands. All of it
 * is SVG stroke geometry and CSS keyframes: no bundle, no hydration, and it
 * stops completely under `prefers-reduced-motion`, where the mark simply
 * arrives already drawn.
 *
 * The sequence is deliberately slower than the one it replaces (1.4s against
 * 0.78s) and starts a beat late. The previous version was finished before the
 * eye had crossed the page from the navigation, which is indistinguishable from
 * no animation at all.
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
      {/* A11Y-04: the heading below names this; the whole mark is decoration. */}
      <div className="order-mark" aria-hidden>
        {RAYS.map((ray) => (
          <span key={ray} className="order-mark-ray" />
        ))}

        <svg viewBox="0 0 120 120" className="order-mark-svg">
          {/* The filled disc, scaling up under everything else. */}
          <circle className="order-mark-disc" cx="60" cy="60" r="52" />
          {/* The ring that draws itself around it. */}
          <circle className="order-mark-ring" cx="60" cy="60" r="52" />
          {/* The tick, stroked on last. */}
          <path className="order-mark-tick" d="M38 62 l16 16 l30 -32" />
        </svg>
      </div>

      <h1 className="text-fg mt-8 text-3xl font-semibold">{title}</h1>

      <div className="border-border rounded-card mt-6 w-full max-w-sm border p-5">
        <p className="text-fg-muted text-xs tracking-wide uppercase">{orderNumberLabel}</p>
        {/*
         * The largest text on the page — the one thing worth remembering, and
         * what a customer would quote if they ring about the order.
         */}
        <p className="text-fg text-3xl font-semibold tracking-wider">{orderNumber}</p>
        <p className="text-fg-muted mt-2 text-xs">
          {placedLabel}: {placedAt}
        </p>
      </div>
    </div>
  );
}
