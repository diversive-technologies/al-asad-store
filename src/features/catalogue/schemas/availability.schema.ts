import { z } from 'zod';

import { productIdSchema } from '@/lib/domain/ids';

/**
 * SSOT-09 — the availability overlay of architecture 8.2.
 *
 * DATA-13: the backend reports a *status*, not a quantity. A stock count on the
 * wire would invite the frontend to decide what "low" means, and that threshold
 * is a commercial value the operator changes in the admin panel. Sending the
 * decision rather than the input keeps one source of truth across the stack.
 *
 * ADR 4: availability is computed by the backend and never stored, so it cannot
 * drift from reality.
 */
export const availabilityStatusSchema = z.enum(['IN_STOCK', 'LOW_STOCK', 'SOLD_OUT']);
export type AvailabilityStatus = z.infer<typeof availabilityStatusSchema>;

export const productAvailabilitySchema = z.object({
  productId: productIdSchema,
  status: availabilityStatusSchema,
  /**
   * For a SET, the backend states which pieces are unavailable so the interface
   * can say exactly what is missing (DATA-13a). Empty for a SIMPLE product and
   * for a fully available SET.
   */
  unavailablePieceNames: z.array(z.string().min(1)),
});

export type ProductAvailability = z.infer<typeof productAvailabilitySchema>;

export const availabilityListSchema = z.array(productAvailabilitySchema);
