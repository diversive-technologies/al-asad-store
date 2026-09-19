import { z } from 'zod';

import { pieceIdSchema, productIdSchema, profileIdSchema, sizeIdSchema } from '@/lib/domain/ids';

import { bagSummarySchema } from './bag.schema';

/**
 * SSOT-09 — the WRITES of architecture §16: what a bag change sends, and every
 * answer it can get back. `bag.schema.ts` holds what the bag IS; this holds how
 * it changes.
 *
 * Split out under MOD-03 when the made-to-measure refusal took the one file past
 * its 300-line ceiling. The seam is the one the contract already had: a read
 * projection on one side, requests and discriminated answers on the other.
 */

/**
 * The size chosen for one piece, on the way in.
 *
 * §16's signature is `{piece_id -> size}`. A list of pairs rather than a keyed
 * object because TS-12 identifiers are branded, and a branded type does not
 * survive as a `Record` key — the pair keeps both ids branded at the boundary.
 */
export const sizeSelectionSchema = z.object({
  pieceId: pieceIdSchema,
  sizeId: sizeIdSchema,
});

export type SizeSelection = z.infer<typeof sizeSelectionSchema>;

/** §16 `addItem(cart, product_id, {piece_id -> size}, qty)`. */
export const addToBagRequestSchema = z
  .object({
    productId: productIdSchema,
    /**
     * §16 invariant: "A line cannot exist without a size selected for every
     * piece of its product." The backend owns the check, because only it knows
     * how many pieces the product has and which of them have a size set at all.
     *
     * A piece with NO size set (§6.1, `size_set_id` null) has no size to select,
     * so it is not named here; §7.1's first step has the backend resolve its key.
     * A product whose every piece is like that — a one-piece unstitched length —
     * is therefore added with an EMPTY list, which is a real stock add and not
     * a made-to-measure one. A made-to-measure line names no sizes either,
     * because it has none to select; the profile is what tells the two apart.
     */
    selections: z.array(sizeSelectionSchema),
    quantity: z.number().int().positive(),
    /**
     * §34 — cut to this saved profile instead of picked off the shelf.
     *
     * An id names one VERSION of a profile. The backend resolves WHOSE it is
     * from the owner it already knows — the session, or the device cookie — so
     * naming somebody else's id here buys nothing.
     */
    madeToMeasureProfileId: profileIdSchema.optional(),
  })
  .refine(
    (request) => request.madeToMeasureProfileId === undefined || request.selections.length === 0,
    { error: 'A made-to-measure add names a profile and no sizes.' },
  );

export type AddToBagRequest = z.infer<typeof addToBagRequestSchema>;

/* The two answers every bag write shares. Named once, so an add and a line change
   cannot drift apart on what "added" or "sold out" carries. */
const addedSchema = z.object({ kind: z.literal('ADDED'), summary: bagSummarySchema });

const unavailableSchema = z.object({
  kind: z.literal('UNAVAILABLE'),
  pieceId: pieceIdSchema,
  pieceName: z.string().min(1),
  sizeLabel: z.string().min(1),
});

/**
 * §16 `-> Ok | Unavailable(piece)`, as a discriminated union (TS-06).
 *
 * §7.1 is emphatic that "failure is specific, not generic. The response names
 * the piece that failed, so the interface can mark 'Trouser — L' rather than
 * telling the customer the set is unavailable and leaving them to guess." A
 * boolean plus an optional message would lose exactly that.
 *
 * The success case carries the whole summary so one round trip both reserves
 * the stock and refreshes the bag (DATA-06).
 */
export const addToBagResultSchema = z.discriminatedUnion('kind', [
  addedSchema,
  unavailableSchema,
  /**
   * §34 — the backend would not cut this garment to the measurements named:
   * they are not this customer's, they were taken for a different garment than
   * the product is cut as, or the product is not cut to measure at all.
   *
   * An ANSWER, not a missing resource, and the difference is load-bearing. It
   * used to come back as a 404, which is also how a cart the backend no longer
   * has is reported — so the BFF took a refused profile for a dead cart, threw
   * the customer's real bag cookie away and retried into a new, empty one.
   *
   * It carries no reason, deliberately. Which of the three it was is not
   * something the customer can act on differently — the answer in every case is
   * to check the measurements for this garment — and "that profile exists but
   * is not yours" is not a fact to hand to whoever is asking.
   */
  z.object({ kind: z.literal('MEASUREMENTS_REFUSED') }),
  /**
   * §16 — the backend would not take the product or the sizes named: a product
   * it does not sell (withdrawn since the page was loaded), or a size cover that
   * does not name every piece exactly once in a size that piece is offered in.
   *
   * An ANSWER, for the reason `MEASUREMENTS_REFUSED` is one. Both used to come
   * back as the 404 a missing cart gets, and the BFF answers that 404 by throwing
   * the cart cookie away — so an add the cart merely refused cost the customer the
   * bag they already had. Only a cart the backend does not have is a 404 now.
   *
   * No reason travels, deliberately: the customer's move is the same whichever it
   * was — look at the page again and choose again.
   */
  z.object({ kind: z.literal('SELECTION_REFUSED') }),
]);

export type AddToBagResult = z.infer<typeof addToBagResultSchema>;

/** §16 `updateQuantity(cart, line, qty)` — 0 is not valid; removal is its own call. */
export const updateQuantityRequestSchema = z.object({
  quantity: z.number().int().positive(),
});

export type UpdateQuantityRequest = z.infer<typeof updateQuantityRequestSchema>;

/**
 * The result of changing a line.
 *
 * Raising a quantity can fail on stock exactly as adding can (§7.1 runs the
 * same transaction), so this is the same shaped answer rather than a bare
 * summary. Lowering it or removing a line always succeeds and releases the
 * reservation immediately, per §16's fourth invariant.
 */
export const updateQuantityResultSchema = z.discriminatedUnion('kind', [
  addedSchema,
  unavailableSchema,
]);

/* Its own type rather than `AddToBagResult`: changing a line names no profile,
   so a refusal of one is not an answer this can give, and a handler forced to
   handle it would be handling something that cannot happen. */
export type UpdateQuantityResult = z.infer<typeof updateQuantityResultSchema>;

/**
 * §16 `moveToWishlist(cart, line)` — every answer the move can get back.
 *
 * Nothing is sent but the line, in the path: WHOSE saved items the product joins
 * is the session's to say, attached on the server side and never named here.
 */
export const moveToWishlistResultSchema = z.discriminatedUnion('kind', [
  /** The product is in the saved items and the line has left the bag, together. */
  z.object({ kind: z.literal('MOVED'), summary: bagSummarySchema }),
  /**
   * The line had already left the bag — another tab, or a lapse something else
   * settled — so NOTHING was saved. The bag as it is comes back, so the line
   * stops being shown rather than being offered again.
   */
  z.object({ kind: z.literal('NOT_IN_BAG'), summary: bagSummarySchema }),
  /**
   * A made-to-measure line, which the backend keeps in the bag: a saved item is
   * a product and nothing else, so moving one would throw away the measurements
   * it is cut to. The interface does not offer it; this is the answer when a
   * request asks anyway.
   */
  z.object({ kind: z.literal('NOT_MOVABLE') }),
]);

export type MoveToWishlistResult = z.infer<typeof moveToWishlistResultSchema>;

/** §16 `applyCode(cart, code)`. */
export const applyCodeRequestSchema = z.object({
  code: z.string().min(1),
});

export type ApplyCodeRequest = z.infer<typeof applyCodeRequestSchema>;

/**
 * Whether a code is valid, what it is worth, and why it was refused are all
 * Pricing's answers (DATA-13). The frontend never inspects the string.
 */
export const applyCodeResultSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('APPLIED'), summary: bagSummarySchema }),
  z.object({ kind: z.literal('REJECTED'), reason: z.string().min(1) }),
]);

export type ApplyCodeResult = z.infer<typeof applyCodeResultSchema>;
