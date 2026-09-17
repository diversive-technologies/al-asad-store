import { z } from 'zod';

import {
  cartLineIdSchema,
  garmentStyleIdSchema,
  pieceIdSchema,
  productIdSchema,
  profileIdSchema,
  sizeIdSchema,
} from '@/lib/domain/ids';

/**
 * SSOT-09 — the wire contract for architecture §16 `CartService`.
 *
 * Two rules from the architecture shape everything here, and both are the kind
 * that a frontend "helpfully" breaks:
 *
 * 1. **§16: "Every line holds a live reservation. Adding without reserving is
 *    not a representable state."** So there is no local "bag" the interface
 *    keeps and syncs later. Adding is a WRITE that either reserved stock or
 *    failed, and the bag the customer sees is the server's answer (STATE-02).
 *
 * 2. **DATA-13: pricing, promotion eligibility and the free-delivery threshold
 *    are backend-owned.** Every money figure below arrives computed. The
 *    frontend adds nothing up — not even the line total, which is why it is on
 *    the wire rather than derived from unit price times quantity.
 */

/**
 * One piece of a line, with the size chosen for it.
 *
 * §28.2 wants "per-piece size display" in the bag, and §6.1 makes that more
 * than a formatting nicety: a three-piece SET is three independently sized
 * pieces, and a customer checking their order needs to see all three. The
 * labels are authored by the backend (I18N-06) — nothing here builds a size
 * string from parts.
 */
export const bagLinePieceSchema = z.object({
  pieceId: pieceIdSchema,
  name: z.string().min(1),
  sizeId: sizeIdSchema,
  sizeLabel: z.string().min(1),
});

export type BagLinePiece = z.infer<typeof bagLinePieceSchema>;

/**
 * §34.8 — what a made-to-measure line is cut from, and what the cutting costs.
 *
 * The charge is a LINE COMPONENT and not a different unit price, which is
 * §34.8's own wording and the reason it is a separate figure: the garment's
 * price stays the garment's price, and a customer can see what the stitching
 * costs rather than being shown a bigger number for the same cloth.
 *
 * The profile is named by ID, and an id names one VERSION — a save that records
 * anything new mints a new one (§34.5), and one that records nothing new answers
 * with the version on file. That is what lets the order refuse rather than
 * quietly cut to figures the customer never confirmed.
 */
export const bagLineStitchingSchema = z.object({
  garmentStyle: garmentStyleIdSchema,
  /** Authored by the backend (I18N-06); nothing here builds it from parts. */
  styleLabel: z.string().min(1),
  profileId: profileIdSchema,
  /** When those measurements were saved — what makes them recognisable. */
  savedAt: z.iso.datetime(),
  figureCount: z.number().int().positive(),
  /**
   * The customer has saved different figures since this line was added, so
   * placement will refuse it (ADR 18). The backend says so on the line, because
   * only the backend knows which version is current — and two lines of one
   * garment otherwise read identically, leaving nothing to tell which one the
   * refusal is about.
   */
  measurementsChanged: z.boolean(),
  chargeMinor: z.number().int().nonnegative(),
  leadTimeDays: z.number().int().positive(),
});

export type BagLineStitching = z.infer<typeof bagLineStitchingSchema>;

/** One line of the bag: a product, at a quantity, off the shelf or cut to fit. */
export const bagLineSchema = z
  .object({
    id: cartLineIdSchema,
    productId: productIdSchema,
    slug: z.string().min(1),
    name: z.string().min(1),
    imageUrl: z.string().min(1),
    /** DATA-13a: declared by the catalogue, never inferred from `pieces.length`. */
    type: z.enum(['SIMPLE', 'SET']),
    /**
     * Empty for a made-to-measure line, and that is the whole of the departure
     * from §16's "a line cannot exist without a size selected for every piece":
     * a garment being cut to somebody's measurements has no size to select.
     * The refinement below holds the invariant for the lines it still governs.
     */
    pieces: z.array(bagLinePieceSchema),
    quantity: z.number().int().positive(),
    unitPriceMinor: z.number().int().nonnegative(),
    /** Sent, not derived. See DATA-13 above. */
    lineTotalMinor: z.number().int().nonnegative(),
    /**
     * §7.3 — when this line's hold lapses. DATA-12: ISO-8601 on the wire, parsed
     * at this boundary.
     *
     * The interface shows it and nothing more. "Correctness never depends on a
     * background job having run" because availability filters on `expires_at` at
     * READ time — so a countdown reaching zero in the browser is a display event,
     * not the thing that frees the stock.
     *
     * NULL for a made-to-measure line, which holds nothing: a garment being cut
     * has not taken a standard size off the shelf, and there is no cloth in the
     * fixture to hold instead. A time would be a claim about a hold that does
     * not exist.
     */
    reservationExpiresAt: z.iso.datetime().nullable(),
    /** §34.8 — present exactly when the line is being CUT rather than picked. */
    stitching: bagLineStitchingSchema.nullable(),
  })
  /*
   * ONE place where the two kinds of line are told apart, so neither can arrive
   * half-formed: a picked line has pieces with sizes and a live hold, and a cut
   * line has neither and carries what it is cut from instead.
   */
  .refine(
    (line) =>
      line.stitching === null
        ? line.pieces.length > 0 && line.reservationExpiresAt !== null
        : line.pieces.length === 0 && line.reservationExpiresAt === null,
    { error: 'A bag line must be picked from stock or cut to measure, not both or neither.' },
  );

export type BagLine = z.infer<typeof bagLineSchema>;

/**
 * §28.2's free-delivery progress.
 *
 * Every field is stated by the backend, including `remainingMinor`. Subtracting
 * a threshold from a subtotal here would put the delivery rule in two places
 * and drift the day the operator changes it in the admin panel (DATA-13).
 */
export const freeDeliveryProgressSchema = z.object({
  thresholdMinor: z.number().int().positive(),
  remainingMinor: z.number().int().nonnegative(),
  isMet: z.boolean(),
});

export type FreeDeliveryProgress = z.infer<typeof freeDeliveryProgressSchema>;

/** The promotional code currently on the bag, if the backend accepted one. */
export const appliedCodeSchema = z.object({
  code: z.string().min(1),
  /** Authored copy describing what the code did, not a generated sentence. */
  description: z.string().min(1),
});

export type AppliedCode = z.infer<typeof appliedCodeSchema>;

export const bagPricingSchema = z.object({
  subtotalMinor: z.number().int().nonnegative(),
  discountMinor: z.number().int().nonnegative(),
  deliveryMinor: z.number().int().nonnegative(),
  totalMinor: z.number().int().nonnegative(),
  appliedCode: appliedCodeSchema.nullable(),
});

export type BagPricing = z.infer<typeof bagPricingSchema>;

/**
 * §16 `summary(cart) -> {lines[], pricing, freeDeliveryProgress}`.
 *
 * Carries NO cart id, deliberately. The id is a capability — hold it and you
 * hold the bag — so it stays in the httpOnly cookie the BFF manages and never
 * reaches the browser (SEC-01). Nothing in the interface needs it: every
 * request is "my bag", and the BFF knows which that is.
 */
export const bagSummarySchema = z.object({
  lines: z.array(bagLineSchema),
  /**
   * The header badge count, stated rather than summed.
   *
   * Whether a three-piece set counts as one item or three is a commercial
   * decision the operator owns, and summing `lines.length` here would silently
   * make that decision on their behalf.
   */
  itemCount: z.number().int().nonnegative(),
  pricing: bagPricingSchema,
  freeDelivery: freeDeliveryProgressSchema,
});

export type BagSummary = z.infer<typeof bagSummarySchema>;
