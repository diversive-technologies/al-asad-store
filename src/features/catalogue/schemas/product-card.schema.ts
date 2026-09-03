import { z } from 'zod';

import { productIdSchema } from '@/lib/domain/ids';

/**
 * SSOT-09 — the wire contract for a product as it appears on a card.
 *
 * This is the cached product projection of architecture 8.2: everything a card
 * and a listing need, and deliberately NO stock field. Availability is a
 * separate live read merged at render, so browse traffic does not invalidate
 * this cache on every order.
 */

/** DATA-13a: declared by the catalogue, never inferred by counting pieces. */
export const productTypeSchema = z.enum(['SIMPLE', 'SET']);
export type ProductType = z.infer<typeof productTypeSchema>;

export const productPricingSchema = z.object({
  /** DATA-11: minor units (paisa) as integers. Never a float. */
  currentMinor: z.number().int().nonnegative(),
  /**
   * Present only when the product is discounted. The backend decides whether a
   * discount applies; the frontend renders the fact (DATA-13).
   */
  originalMinor: z.number().int().positive().nullable(),
});

export const productCardSchema = z.object({
  id: productIdSchema,
  slug: z.string().min(1),
  name: z.string().min(1),
  type: productTypeSchema,
  /**
   * Derived by the backend from the pieces it holds (ADR 2b), so the count a
   * customer filters on and the rows the system reserves are the same fact.
   */
  pieceCount: z.number().int().positive(),
  imageUrl: z.string().min(1),
  /** Section 28.1: cards show a second image on hover. Not every product has one. */
  hoverImageUrl: z.string().min(1).nullable(),
  /** The "work + fabric" line from section 28.1, supplied already localised. */
  workType: z.string().min(1),
  fabricName: z.string().min(1),
  colourName: z.string().min(1),
  pricing: productPricingSchema,
  /** Unstitched fabric is sold by length; stitched garments are not. */
  metreage: z.number().positive().nullable(),
  /** Backend-owned: "new" is a launch-date rule, not a client computation. */
  isNew: z.boolean(),
});

export type ProductCard = z.infer<typeof productCardSchema>;
