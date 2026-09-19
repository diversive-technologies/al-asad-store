import { CLIENT } from '@/config/client';
import { ROUTES } from '@/config/routes';
import { absoluteUrl } from '@/config/site';
import type { JsonLdDocument } from '@/lib/utils/json-ld';
import { SCHEMA_ORG_CONTEXT, schemaOrgPrice } from '@/lib/utils/structured-data';

import type { AvailabilityStatus } from '../schemas/availability.schema';
import type { ProductDetailAvailability } from '../schemas/piece-availability.schema';
import type { ProductDetail } from '../schemas/product-detail.schema';

/**
 * §30.5 "Product structured data on every product page", built from the SAME two
 * reads the page renders: the cached projection and the live availability overlay.
 * So the price is the price in the buy box, and the stock is what the buy box says.
 *
 * DATA-13: availability is the backend's verdict for the product as a whole
 * (`status`), mapped one to one — nothing here scans the pieces to decide. When
 * the overlay could not be read the page says availability is unknown, so this
 * says nothing at all rather than guessing in either direction.
 *
 * No `aggregateRating` and no `review`: §28.6 defers reviews to Release 2, and a
 * rating with nothing behind it is exactly the fabrication §30.5 would be
 * publishing to every search engine.
 */

const AVAILABILITY: Readonly<Record<AvailabilityStatus, string>> = {
  IN_STOCK: 'https://schema.org/InStock',
  // Still buyable — the page shows it as low, and schema.org's word for that is this.
  LOW_STOCK: 'https://schema.org/LimitedAvailability',
  // Not SoldOut: Notify Me offers the size again, so it is out of stock, not ended.
  SOLD_OUT: 'https://schema.org/OutOfStock',
};

/** The schema.org availability for the backend's verdict, or `undefined` when there is none. */
export function schemaOrgAvailability(
  availability: ProductDetailAvailability | null,
): string | undefined {
  return availability === null ? undefined : AVAILABILITY[availability.status];
}

/**
 * One product's `Product` document. `brandName` is the store's own name as the
 * page's locale writes it (`messages.site.name`) — the store sells under its own
 * label, and the name is copy (SSOT-07), not configuration.
 */
export function productStructuredData(
  product: ProductDetail,
  availability: ProductDetailAvailability | null,
  brandName: string,
): JsonLdDocument {
  const url = absoluteUrl(ROUTES.catalogue.detail(product.slug));

  return {
    '@context': SCHEMA_ORG_CONTEXT,
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.code,
    image: product.media.map((medium) => absoluteUrl(medium.url)),
    url,
    brand: { '@type': 'Brand', name: brandName },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: CLIENT.market.currency.code,
      price: schemaOrgPrice(product.pricing.currentMinor),
      availability: schemaOrgAvailability(availability),
    },
  };
}
