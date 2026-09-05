import { z } from 'zod';

/**
 * SSOT-09 — the wire contract for architecture §25 `FabricCalculator.evaluate`.
 *
 * §25 makes this a BACKEND module that owns "the requirement table mapping
 * height band and garment style to metres required". So the frontend sends a
 * height and a style and renders the verdict it gets back — it does not hold the
 * table, does not subtract, and does not decide what counts as "just enough"
 * (DATA-13). That threshold is a configured margin the operator tunes, and a
 * second copy of it here would drift the day they change it.
 *
 * The frontend does not decide ELIGIBILITY either. §25 offers the calculator
 * "only for products with at least one unstitched piece", and that is a rule
 * about the catalogue, so the product payload states whether to offer it and
 * supplies the style vocabulary.
 */

/** One garment style the requirement table knows about. */
export const garmentStyleSchema = z.object({
  id: z.string().min(1),
  /** Already localised; the frontend never derives a style label. */
  label: z.string().min(1),
});

export type GarmentStyle = z.infer<typeof garmentStyleSchema>;

/**
 * Present on a product when the calculator applies, `null` when it does not.
 *
 * Null is the eligibility answer, not a missing field: a fully stitched product
 * has no metreage to evaluate, and the interface simply does not draw the panel.
 */
export const fabricCalculatorOfferSchema = z.object({
  styles: z.array(garmentStyleSchema).min(1),
  /** The sensible height bounds of the table, for the input's own limits. */
  minHeightCm: z.number().int().positive(),
  maxHeightCm: z.number().int().positive(),
});

export type FabricCalculatorOffer = z.infer<typeof fabricCalculatorOfferSchema>;

/**
 * §25's three outcomes, as a discriminated union rather than a number plus a
 * flag (TS-06). Each carries exactly the figure its own case needs: how much is
 * spare, or how much is missing. `JUST_ENOUGH` carries neither, because "it
 * fits, barely" is the whole message.
 */
export const fabricVerdictSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('COMFORTABLE'), spareMetres: z.number().nonnegative() }),
  z.object({ kind: z.literal('JUST_ENOUGH') }),
  z.object({ kind: z.literal('INSUFFICIENT'), shortfallMetres: z.number().positive() }),
]);

export type FabricVerdict = z.infer<typeof fabricVerdictSchema>;

/**
 * §25: "A pure function. No customer input is stored." The request carries the
 * height for the length of one call and nothing persists it — which is why this
 * is a read rather than a submission, and why nothing here has an id.
 */
export const fabricQuerySchema = z.object({
  productId: z.string().min(1),
  heightCm: z.number().int().positive(),
  styleId: z.string().min(1),
});

export type FabricQuery = z.infer<typeof fabricQuerySchema>;
