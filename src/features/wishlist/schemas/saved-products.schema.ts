import { z } from 'zod';

import { productAvailabilitySchema, productCardSchema } from '@/features/catalogue/contract';

/**
 * SSOT-09 — the saved-items page's read of `/api/products`: every saved product
 * as a card beside the availability that decorates it.
 *
 * The shape mirrors what `mergeAvailability` produces on the server, with `null`
 * meaning "not known" rather than "sold out" (§30.2). DATA-02 — our own BFF is a
 * network boundary like any other, so this is parsed rather than cast.
 */
export const savedEntriesSchema = z.object({
  entries: z.array(
    z.object({
      product: productCardSchema,
      availability: productAvailabilitySchema.nullable(),
    }),
  ),
});
