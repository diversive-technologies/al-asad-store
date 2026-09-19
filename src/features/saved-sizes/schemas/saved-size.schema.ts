import { z } from 'zod';

import { sizeIdSchema, sizeSetIdSchema } from '@/lib/domain/ids';

/**
 * SSOT-09 — §28.3's saved sizes, as the account holds them.
 *
 * A saved size is kept per SIZE SET (§6.1 `Piece.size_set_id`), because a size
 * only means something against its chart: "M" in a kameez chart and "32" in a
 * trouser waist chart are two answers, and a customer can have one of each. A
 * size id names one size of one set, so a product page matches a saved size to a
 * piece by its size id alone — the product projection carries no set id, and
 * needs none.
 *
 * Which size is current for a set is the BACKEND's to decide (DATA-13): the
 * storefront sends a size id, and the answer is the account's whole list.
 */

/**
 * SEC-02 — the length of a served list is untrusted input. There is one entry
 * per size set at most, and a catalogue's charts number in single figures; this
 * ceiling is far past that and short of anything a page would struggle to draw.
 */
export const MAX_SAVED_SIZES = 50;

export const savedSizeSchema = z.object({
  /** The chart, with the name the catalogue gives it in this language (§28.1). */
  sizeSet: z.object({ id: sizeSetIdSchema, name: z.string().min(1) }),
  /** Already localised; the frontend never derives a size label. */
  size: z.object({ id: sizeIdSchema, label: z.string().min(1) }),
  savedAt: z.iso.datetime(),
});

/**
 * The account's current sizes. Each size set appears at most ONCE — asserted at
 * the boundary rather than assumed, because two current sizes for one chart would
 * give the product page two sizes to pre-select for the same piece. Like the
 * product schema's §6.1 check, this decides nothing: it checks that the facts the
 * backend sent agree with each other.
 */
export const savedSizesSchema = z
  .object({ sizes: z.array(savedSizeSchema).max(MAX_SAVED_SIZES) })
  .refine(({ sizes }) => new Set(sizes.map((entry) => entry.sizeSet.id)).size === sizes.length, {
    error: 'A size set may hold only one current saved size (§28.3).',
    path: ['sizes'],
  });

/** Naming one size: to remember it, or to forget it. */
export const savedSizeChoiceSchema = z.object({ sizeId: sizeIdSchema });

export type SavedSize = z.infer<typeof savedSizeSchema>;
export type SavedSizes = z.infer<typeof savedSizesSchema>;
export type SavedSizeChoice = z.infer<typeof savedSizeChoiceSchema>;
