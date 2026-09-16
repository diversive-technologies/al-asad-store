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
  /**
   * §34.8 — what the cutting costs, as a LINE COMPONENT rather than a different
   * unit price. It lives on the OFFER because the offer is the one definition
   * both features read: the studio serves it and the product page carries it,
   * so a charge stated anywhere else would be a second copy of a backend rule
   * (DATA-13) and the two would eventually quote different numbers.
   *
   * §31 #35 makes it configuration, by garment style, "To be set". The figure in
   * the mock is FIXTURE — see the header of `measurement-sets-db.ts` — and is the
   * operator's to supply before anyone is asked to pay it.
   */
  stitchingChargeMinor: z.number().int().nonnegative(),
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
