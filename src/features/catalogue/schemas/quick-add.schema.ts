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

/** See `QuickAddOffer` in `lib/quick-add.ts` for the two shapes. */
export const quickAddOfferSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('SIZED'),
    productId: productIdSchema,
    /** The pieces the chosen size is applied to — every piece with a size set. */
    pieceIds: z.array(pieceIdSchema).min(1),
    sizes: z.array(quickAddSizeSchema),
  }),
  z.object({
    kind: z.literal('ONE_SIZE'),
    productId: productIdSchema,
    /** No piece has a size to choose; this says whether the product can be had. */
    isAvailable: z.boolean(),
  }),
]);

export type QuickAddOfferPayload = z.infer<typeof quickAddOfferSchema>;
