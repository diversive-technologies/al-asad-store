import type { ProductAvailability } from '../schemas/availability.schema';
import type { ProductCard } from '../schemas/product-card.schema';

/**
 * MOD-04 — pure, React-free, unit-testable without a renderer.
 *
 * Section 28.1 requires the four badges to be computed, never hand-set. What is
 * computed here is only the *mapping* from facts the backend reported onto
 * badges; no threshold or eligibility rule is decided on this side of the wire
 * (DATA-13). "New" arrives as a boolean, "low stock" arrives as a status, and a
 * discount is the presence of an original price.
 */
export type ProductBadgeKind = 'NEW' | 'DISCOUNT' | 'LOW_STOCK' | 'SOLD_OUT';

/** A card joined to its live availability overlay (architecture 8.2). */
export interface ProductCardWithAvailability {
  product: ProductCard;
  /**
   * `null` when the overlay did not report on this product. Availability is
   * unknown, not "in stock" — the interface must not imply purchasability the
   * backend never confirmed (DATA-13a).
   */
  availability: ProductAvailability | null;
}

export function isDiscounted(product: ProductCard): boolean {
  return product.pricing.originalMinor !== null;
}

/**
 * Badge precedence: a sold-out product shows only that. Once a customer cannot
 * buy it, "New" and "Sale" are noise competing with the one fact that matters.
 */
export function deriveProductBadges(
  product: ProductCard,
  availability: ProductAvailability | null,
): readonly ProductBadgeKind[] {
  if (availability?.status === 'SOLD_OUT') return ['SOLD_OUT'];

  const badges: ProductBadgeKind[] = [];

  if (product.isNew) badges.push('NEW');
  if (isDiscounted(product)) badges.push('DISCOUNT');
  if (availability?.status === 'LOW_STOCK') badges.push('LOW_STOCK');

  return badges;
}

/**
 * Joins the cached product projection to the live availability overlay.
 *
 * The two arrive from separate reads with different caching intents, so the
 * overlay may be shorter than, longer than, or out of order with the product
 * list. Matching by id rather than by position is what makes that safe.
 */
export function mergeAvailability(
  products: readonly ProductCard[],
  availabilities: readonly ProductAvailability[],
): readonly ProductCardWithAvailability[] {
  const byProductId = new Map(availabilities.map((entry) => [entry.productId, entry]));

  return products.map((product) => ({
    product,
    availability: byProductId.get(product.id) ?? null,
  }));
}
