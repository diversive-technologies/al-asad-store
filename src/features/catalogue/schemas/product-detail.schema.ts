import { z } from 'zod';

import { fabricIdSchema, pieceIdSchema, productIdSchema, sizeIdSchema } from '@/lib/domain/ids';

import { fabricCalculatorOfferSchema } from './fabric-calculator.schema';
import { productPricingSchema, productTypeSchema } from './product-card.schema';

/**
 * SSOT-09 — the wire contract for architecture §12 `CatalogueQuery.getProduct`.
 *
 * This is the cached product projection of §8.2, and like the card projection it
 * carries NO quantity of any kind. §12 is explicit: "Sold out is not a catalogue
 * concept — it is an Inventory answer, and keeping it out of this module is what
 * allows product data to be cached for hours while stock stays live." The
 * per-size overlay is a separate read (`piece-availability.schema.ts`).
 *
 * Storage is uniform, behaviour is explicit (§6.1). A SIMPLE product still has
 * one `Piece` row, so the frontend receives one shape and branches on the
 * DECLARED `type` — never on `pieces.length` (DATA-13a).
 */

/** §6.2 — three customer-facing fields, held once per colour. */
export const colourSchema = z.object({
  displayName: z.string().min(1),
  /** "a soft muted green with a grey undertone" — copy, not a computed label. */
  description: z.string().min(1),
  hex: z.string().min(1),
});

export type Colour = z.infer<typeof colourSchema>;

/**
 * §6.3 — care text lives on the FABRIC, not the product: "A hundred lawn
 * products share one care text." Duplicating it per product would be PD-01 all
 * over again, one row at a time.
 */
export const fabricSchema = z.object({
  id: fabricIdSchema,
  name: z.string().min(1),
  weight: z.enum(['LIGHT', 'MEDIUM', 'HEAVY']),
  /** One line, shown in the filter and on the product page. */
  explainer: z.string().min(1),
  careText: z.string().min(1),
});

export type Fabric = z.infer<typeof fabricSchema>;

/** One selectable size within a piece's size set. */
export const sizeOptionSchema = z.object({
  id: sizeIdSchema,
  /** Already localised; the frontend never derives a size label. */
  label: z.string().min(1),
});

export type SizeOption = z.infer<typeof sizeOptionSchema>;

/**
 * §6.1 Piece. `sizes` is empty for a one-size piece (`size_set_id` nullable),
 * which is a real state rather than a missing value — a dupatta has no size.
 */
export const pieceSchema = z.object({
  id: pieceIdSchema,
  code: z.string().min(1),
  name: z.string().min(1),
  /** Display order, decided by the catalogue rather than by array position. */
  position: z.number().int().nonnegative(),
  fabric: fabricSchema,
  colour: colourSchema,
  sizes: z.array(sizeOptionSchema),
  /** §12 invariant: required on unstitched pieces, absent otherwise. */
  lengthMetres: z.number().positive().nullable(),
});

export type Piece = z.infer<typeof pieceSchema>;

export const productMediaSchema = z.object({
  url: z.string().min(1),
  /** A11Y-04: alt text is authored by the operator, never generated here. */
  alt: z.string(),
});

export type ProductMedia = z.infer<typeof productMediaSchema>;

/** §28.2's "four information sections" — how many is editorial, not structural. */
export const infoSectionSchema = z.object({
  id: z.string().min(1),
  heading: z.string().min(1),
  body: z.string().min(1),
});

export type InfoSection = z.infer<typeof infoSectionSchema>;

/**
 * §28.2 "Model height and size worn". Null when the product was not shot on a
 * model — unstitched fabric usually is not.
 */
export const modelInfoSchema = z.object({
  heightCm: z.number().int().positive(),
  sizeWorn: z.string().min(1),
});

export type ModelInfo = z.infer<typeof modelInfoSchema>;

const productDetailShape = z.object({
  id: productIdSchema,
  code: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  /** DATA-13a: declared at creation, the field every behaviour branches on. */
  type: productTypeSchema,
  media: z.array(productMediaSchema).min(1),
  pieces: z.array(pieceSchema).min(1),
  pricing: productPricingSchema,
  /** True when any piece is sold by length rather than by size. */
  isUnstitched: z.boolean(),
  model: modelInfoSchema.nullable(),
  /**
   * §28.2 "Estimated delivery date", as an ISO date the backend calculated.
   * DATA-13: a client that added "3 working days" to today would be inventing a
   * logistics rule, and would get public holidays wrong every time.
   */
  estimatedDeliveryDate: z.iso.date(),
  infoSections: z.array(infoSectionSchema),
  /**
   * §25 — present when the Fabric Calculator applies to this product, `null`
   * when it does not. The BACKEND decides: "offered only for products with at
   * least one unstitched piece" is a catalogue rule, and an interface that
   * inferred it from `isUnstitched` would be a second implementation of it
   * (DATA-13).
   */
  fabricCalculator: fabricCalculatorOfferSchema.nullable(),
  isNew: z.boolean(),
});

/**
 * The §6.1 invariant, asserted at the boundary rather than assumed.
 *
 * `SIMPLE` ⟹ exactly one piece; `SET` ⟹ two or more. The backend enforces this
 * at publish, so a published product always satisfies it — which is precisely
 * why a violation arriving here means the contract is broken, and should surface
 * as a handled CONTRACT_VIOLATION rather than as a buy box that renders a
 * per-piece override panel with nothing to override.
 *
 * This is validation, not DATA-13 reimplementation: nothing here decides the
 * type or counts pieces to derive it. It checks that two facts the backend sent
 * agree with each other.
 */
export const productDetailSchema = productDetailShape.refine(
  (product) =>
    product.type === 'SIMPLE' ? product.pieces.length === 1 : product.pieces.length > 1,
  {
    error: 'A SIMPLE product must have exactly one piece and a SET must have two or more (§6.1).',
    path: ['pieces'],
  },
);

export type ProductDetail = z.infer<typeof productDetailSchema>;
