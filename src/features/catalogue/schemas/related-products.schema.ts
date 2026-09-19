import { z } from 'zod';

import { productCardSchema } from './product-card.schema';

/**
 * SSOT-09 — §28.2's "You may also like": the products the backend relates to one
 * product, in the order to show them.
 *
 * The CARD projection and nothing else (architecture 8.2), so the section renders
 * the catalogue's own card and stock arrives as the same separate, live overlay a
 * listing reads.
 */

/**
 * How many related products the product page asks for.
 *
 * The section is drawn in the listing's own `product-grid`, so this is the same
 * arithmetic as `DEFAULT_PAGE_SIZE`: it must divide by every column count the
 * grid renders, or a product with more related products than fit ends on a
 * part-filled row while the rest were cut off. 12 is the SMALLEST number that
 * divides 1, 2, 3, 4 and 6, and `grid-columns.test.ts` asserts it against
 * `GRID_COLUMN_COUNTS`. Fewer come back when fewer are related, and that last
 * row is simply the end of the list.
 *
 * Sent to the backend as `limit` rather than left to it: the grid is this side's
 * fact, and which products fill it is the backend's (DATA-13).
 */
export const RELATED_PRODUCTS_LIMIT = 12;

export const relatedProductsSchema = z
  .array(productCardSchema)
  /* More than was asked for is a broken contract, not a longer section: the
     limit is what keeps every row of the grid full. */
  .max(RELATED_PRODUCTS_LIMIT)
  /* CMP-10 keys every tile on its product id, so the same product twice is a
     defect this side would otherwise render as a React key collision. */
  .refine((products) => new Set(products.map((product) => product.id)).size === products.length, {
    message: 'A related product is listed more than once.',
  });

export type RelatedProducts = z.infer<typeof relatedProductsSchema>;
