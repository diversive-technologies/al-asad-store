import type { z } from 'zod';

import { productIdSchema, type ProductId } from '@/lib/domain/ids';

import { productCardSchema, type ProductCard } from '../schemas/product-card.schema';

/**
 * Test support — the smallest product card the wire contract admits, for the
 * catalogue tests that draw a card or answer a read with some. Imported by
 * tests only; nothing in the catalogue may import it.
 *
 * Written in the WIRE shape and parsed through `productCardSchema` (SSOT-09), so
 * a test holds exactly what the storefront holds after a real read, and a field
 * the contract gains is added here once rather than in every test that needs a
 * card (PD-01). The words are placeholders, never a product the store sells
 * (SEC-10).
 */

type ProductCardWire = z.input<typeof productCardSchema>;

/** A product id shaped as the contract requires — a UUID — and plainly not a real one. */
export function fixtureProductId(n: number): ProductId {
  return productIdSchema.parse(`00000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
}

/**
 * The `n`th fixture card: a one-piece garment sold by size, at full price.
 * `overrides` changes only the facts a test is about, in the wire shape.
 */
export function productCardFixture(
  n: number,
  overrides: Partial<ProductCardWire> = {},
): ProductCard {
  return productCardSchema.parse({
    id: fixtureProductId(n),
    slug: `fixture-kurta-${String(n)}`,
    name: `Fixture kurta ${String(n)}`,
    type: 'SIMPLE',
    pieceCount: 1,
    images: [`/placeholders/product-${String(n)}.avif`],
    workType: 'Plain',
    fabricName: 'Cotton',
    colourName: 'Ivory',
    pricing: { currentMinor: 349_900, originalMinor: null },
    metreage: null,
    isNew: false,
    isMadeToMeasure: false,
    ...overrides,
  } satisfies ProductCardWire);
}
