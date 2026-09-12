import { z } from 'zod';

import { garmentStyleIdSchema } from './ids';

/**
 * A style the workshop will stitch, and how long it takes (A2-4).
 *
 * In the domain layer rather than in a feature (STRUCT-05): Made-to-Measure lists
 * these offers and the catalogue's product payload carries one, so both features
 * read one definition and neither imports the other for it.
 *
 * The product carries its offer BY VALUE. Its read is tagged `made-to-measure` as
 * well as `catalogue`, so an edit to an offer invalidates both reads and the two
 * cannot quote different days for longer than that takes.
 */
export const styleOfferSchema = z.object({
  garmentStyle: garmentStyleIdSchema,
  leadTimeDays: z.number().int().positive(),
});

/** Never empty, and typed so: the first offer is what a bare `/stitched` opens. */
export const styleOffersSchema = z
  .tuple([styleOfferSchema], styleOfferSchema)
  .refine(
    (offers) => new Set(offers.map((offer) => offer.garmentStyle)).size === offers.length,
    { error: 'A style is offered twice.' },
  );

export type StyleOffer = z.infer<typeof styleOfferSchema>;
export type StyleOffers = z.infer<typeof styleOffersSchema>;
