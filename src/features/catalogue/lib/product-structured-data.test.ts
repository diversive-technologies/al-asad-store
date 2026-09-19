import { describe, expect, it } from 'vitest';

import { CLIENT } from '@/config/client';
import { ROUTES } from '@/config/routes';
import { absoluteUrl } from '@/config/site';
import { CATALOGUE, type CatalogueRecord } from '@/lib/mocks/catalogue-db';
import { toProductDetail } from '@/lib/mocks/product-detail-db';
import { serializeJsonLd } from '@/lib/utils/json-ld';
import { schemaOrgPrice } from '@/lib/utils/structured-data';

import type { AvailabilityStatus } from '../schemas/availability.schema';
import {
  productDetailAvailabilitySchema,
  type ProductDetailAvailability,
} from '../schemas/piece-availability.schema';
import { productDetailSchema, type ProductDetail } from '../schemas/product-detail.schema';
import { productStructuredData, schemaOrgAvailability } from './product-structured-data';

/**
 * §30.5 — Product structured data, from the two reads the page itself renders:
 * the projection as the contract parses it, and the live overlay's verdict.
 * Products are found by PROPERTY, never by a slug or code written here.
 */

function detailOf(predicate: (record: CatalogueRecord) => boolean): ProductDetail {
  const record = CATALOGUE.find(predicate);
  if (record === undefined) throw new Error('the fixture has no product of that kind');
  return productDetailSchema.parse(toProductDetail(record, 'en'));
}

const SET = detailOf((record) => record.type === 'SET');
const DISCOUNTED = detailOf((record) => record.originalMinor !== null);

function availabilityOf(
  product: ProductDetail,
  status: AvailabilityStatus,
): ProductDetailAvailability {
  return productDetailAvailabilitySchema.parse({ productId: product.id, status, pieces: [] });
}

/** The document as a search engine reads it: through the serialiser and parsed back. */
function published(
  product: ProductDetail,
  availability: ProductDetailAvailability | null,
): unknown {
  return JSON.parse(serializeJsonLd(productStructuredData(product, availability, 'Al-Asad')));
}

describe('productStructuredData', () => {
  it('names the product, its code as the SKU and the store as the brand', () => {
    expect(published(SET, availabilityOf(SET, 'IN_STOCK'))).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: SET.name,
      description: SET.description,
      sku: SET.code,
      brand: { '@type': 'Brand', name: 'Al-Asad' },
      url: absoluteUrl(ROUTES.catalogue.detail(SET.slug)),
    });
  });

  it('lists every photograph the page shows, each as an absolute address', () => {
    const document = published(SET, null);

    expect(document).toHaveProperty(
      'image',
      SET.media.map((medium) => absoluteUrl(medium.url)),
    );
    expect(document).toHaveProperty(
      'image',
      SET.media.map(() => expect.stringMatching(/^https?:\/\/[^/]+\/.+/)),
    );
  });

  it('offers the CURRENT price, in the store currency, as a plain decimal', () => {
    const document = published(DISCOUNTED, availabilityOf(DISCOUNTED, 'IN_STOCK'));

    expect(document).toMatchObject({
      offers: {
        '@type': 'Offer',
        priceCurrency: CLIENT.market.currency.code,
        price: schemaOrgPrice(DISCOUNTED.pricing.currentMinor),
        url: absoluteUrl(ROUTES.catalogue.detail(DISCOUNTED.slug)),
      },
    });
    expect(document).toHaveProperty('offers.price', expect.stringMatching(/^\d+\.\d{2}$/));
    // The was-price is the page's to show beside it; the offer is what it costs now.
    expect(document).not.toHaveProperty(
      'offers.price',
      schemaOrgPrice(DISCOUNTED.pricing.originalMinor ?? 0),
    );
  });

  it.each([
    ['IN_STOCK', 'https://schema.org/InStock'],
    ['LOW_STOCK', 'https://schema.org/LimitedAvailability'],
    ['SOLD_OUT', 'https://schema.org/OutOfStock'],
  ] as const)('publishes %s as %s — the verdict the buy box shows', (status, expected) => {
    expect(published(SET, availabilityOf(SET, status))).toHaveProperty(
      'offers.availability',
      expected,
    );
  });

  it('says nothing about stock when the live overlay could not be read', () => {
    const document = published(SET, null);

    expect(schemaOrgAvailability(null)).toBeUndefined();
    expect(document).not.toHaveProperty('offers.availability');
    expect(document).toHaveProperty('offers.price');
  });

  it('invents no rating and no review (§28.6 defers reviews)', () => {
    const document = published(SET, availabilityOf(SET, 'IN_STOCK'));

    expect(document).not.toHaveProperty('aggregateRating');
    expect(document).not.toHaveProperty('review');
  });
});
