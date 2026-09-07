import { z } from 'zod';

import { pieceIdSchema, productIdSchema, sizeIdSchema } from '@/lib/domain/ids';

/**
 * SSOT-09 — what a catalogue card needs to sell a product without leaving the
 * grid: the pieces to reserve, and the sizes it may offer.
 *
 * Read on demand rather than carried on every card. Architecture §8.2 keeps
 * stock out of the cached product projection, and 24 cards each carrying a live
 * per-size availability list would put it back — so the tray asks when the
 * customer opens it, which is also the freshest possible moment.
 */
export const quickAddSizeSchema = z.object({
  id: sizeIdSchema,
  label: z.string().min(1),
  isAvailable: z.boolean(),
});

export const quickAddOfferSchema = z.object({
  productId: productIdSchema,
  /** Every piece the add must reserve — one for a SIMPLE, three for a suit. */
  pieceIds: z.array(pieceIdSchema).min(1),
  sizes: z.array(quickAddSizeSchema),
});

export type QuickAddOfferPayload = z.infer<typeof quickAddOfferSchema>;
