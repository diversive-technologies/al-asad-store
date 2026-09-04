import { z } from 'zod';

import { pieceIdSchema, productIdSchema, sizeIdSchema } from '@/lib/domain/ids';

import { availabilityStatusSchema } from './availability.schema';

/**
 * SSOT-09 — the live availability overlay for ONE product, at the granularity
 * the product page needs.
 *
 * The card overlay (`availability.schema.ts`) answers "can this product be
 * bought at all", which is what a grid tile shows. The product page has to
 * answer something narrower — "can THIS size of THIS piece be bought" — because
 * §28.2 requires sold-out sizes to be shown as sold out rather than hidden, with
 * Notify Me offered on them.
 *
 * §13 keys inventory on `(piece_id, size)` for every product, SIMPLE or SET
 * alike, which is exactly the shape below. Uniform storage, explicit behaviour
 * (§6.1) — the interface branches on `product_type`, never on this payload.
 *
 * Still no quantity (DATA-13): the backend reports a status per size, so "low
 * stock" stays a threshold the operator owns.
 */

export const sizeAvailabilitySchema = z.object({
  sizeId: sizeIdSchema,
  status: availabilityStatusSchema,
});

export type SizeAvailability = z.infer<typeof sizeAvailabilitySchema>;

export const pieceAvailabilitySchema = z.object({
  pieceId: pieceIdSchema,
  /**
   * Empty for a one-size piece, which has no size set to report against. Such a
   * piece carries its buyability in `status` alone.
   */
  sizes: z.array(sizeAvailabilitySchema),
  /** The piece as a whole, so a one-size piece is still answerable. */
  status: availabilityStatusSchema,
});

export type PieceAvailability = z.infer<typeof pieceAvailabilitySchema>;

export const productDetailAvailabilitySchema = z.object({
  productId: productIdSchema,
  /**
   * The product as a whole. For a SET this is the backend's verdict across every
   * piece — §16 makes a SET unbuyable when ONE piece is gone, and that rule is
   * the backend's to apply, not something the interface derives by scanning the
   * array below (DATA-13).
   */
  status: availabilityStatusSchema,
  pieces: z.array(pieceAvailabilitySchema),
});

export type ProductDetailAvailability = z.infer<typeof productDetailAvailabilitySchema>;
