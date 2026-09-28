import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import { CLIENT } from '@/config/client';
import { ROUTES } from '@/config/routes';
import { absoluteUrl } from '@/config/site';
import { serializeJsonLd } from '@/lib/utils/json-ld';
import { schemaOrgPrice } from '@/lib/utils/structured-data';

import type { AvailabilityStatus } from '../schemas/availability.schema';
import {
  productDetailAvailabilitySchema,
  type ProductDetailAvailability,
} from '../schemas/piece-availability.schema';
import { productDetailSchema, type ProductDetail } from '../schemas/product-detail.schema';
import { productStructuredData, schemaOrgAvailability } from './product-structured-data';
import { fixtureProductId } from './test-fixtures';

/**
 * §30.5 — Product structured data, from the two reads the page itself renders:
 * the projection as the contract parses it, and the live overlay's verdict.
 * The products are the smallest the contract admits, written in the wire shape
 * and parsed through `productDetailSchema`, so each holds what the page holds.
 */

type ProductDetailWire = z.input<typeof productDetailSchema>;
type PieceWire = ProductDetailWire['pieces'][number];

/** One sized piece — `n` keeps its ids apart from its neighbours'. */
function piece(n: number, name: string): PieceWire {
  const serial = String(n).padStart(12, '0');
  return {
    id: `00000000-0000-4000-8001-${serial}`,
    code: `FX-${String(n)}`,
    name,
    position: n,
    fabric: {
      id: `00000000-0000-4000-8002-${serial}`,
      name: 'Cotton',
      weight: 'MEDIUM',
      explainer: 'A placeholder cloth.',
      careText: 'Placeholder care text.',
    },
    colour: { displayName: 'Ivory', description: 'A placeholder colour.', hex: '#efe9dd' },
    sizes: [{ id: `00000000-0000-4000-8003-${serial}`, label: 'M' }],
    lengthMetres: null,
  };
}

/** A one-piece product at full price, changed only where a case needs it. */
function productDetail(n: number, overrides: Partial<ProductDetailWire>): ProductDetail {
  return productDetailSchema.parse({
    id: fixtureProductId(n),
    code: `FX-${String(n)}`,
    slug: `fixture-product-${String(n)}`,
    name: `Fixture product ${String(n)}`,
    description: 'A placeholder description.',
    type: 'SIMPLE',
    media: [{ url: `/placeholders/product-${String(n)}.avif`, alt: 'A placeholder photograph' }],
    pieces: [piece(n * 10, 'Kurta')],
    pricing: { currentMinor: 349_900, originalMinor: null },
    isUnstitched: false,
    model: null,
    estimatedDeliveryDate: '2026-09-11',
    infoSections: [],
    fabricCalculator: null,
    stitching: null,
    isNew: false,
    ...overrides,
  } satisfies ProductDetailWire);
}

/** A two-piece set, photographed from more than one side. */
const SET = productDetail(1, {
  type: 'SET',
  pieces: [piece(11, 'Kameez'), piece(12, 'Shalwar')],
  media: [
    { url: '/placeholders/product-1.avif', alt: 'A placeholder photograph, front' },
    { url: '/placeholders/product-1-2.avif', alt: 'A placeholder photograph, back' },
  ],
});
/** On sale: the backend sent a was-price beside the current one. */
const DISCOUNTED = productDetail(2, {
  pricing: { currentMinor: 349_900, originalMinor: 472_400 },
});

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
