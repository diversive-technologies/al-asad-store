import type { Locale } from '@/i18n/locales';
import type { StyleOffer } from '@/lib/domain/style-offer';

import { CATALOGUE, productNameFor, type CatalogueRecord } from './catalogue-db';
import { frameUrls } from './catalogue-photography';
import { FABRICS, vocabularyLabel } from './catalogue-vocabulary';
import { fabricCalculatorOfferFor } from './fabric-calculator-db';
import { COLOUR_DETAIL, FABRIC_DETAIL, INFO_SECTIONS, PIECE_NAMES } from './product-content-db';
import { sizeOptionsOf, STANDARD_SIZE_SET } from './size-sets-db';
import { stitchingOfferForGarment } from './stitching-offers';

/**
 * D1 — the product-page fixture, derived from the SAME `CATALOGUE` records the
 * listing uses.
 *
 * A second product list here would let the grid and the product page disagree
 * about what the store sells (PD-01). Everything below adds detail the card
 * projection deliberately omits — pieces, media, fabric care, colour copy — and
 * invents no products.
 *
 * DATA-13 holds throughout: this fixture REPORTS facts the way a backend states
 * them. It never computes a rule the Java service will own, and it carries no
 * quantity anywhere (§12: "Contains no quantity field of any kind").
 */

/** Deterministic, RFC-4122-shaped ids so the schemas' `z.uuid()` accepts them. */
function mockId(group: string, index: number): string {
  return `a1b2c3d4-${group}-4c8a-8f21-${String(index).padStart(12, '0')}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The backend's delivery estimate, stated the way it would state one: a day
 * AHEAD of today — three to six days out, varied by product so the interface
 * cannot assume one lead time. It is the backend's to calculate (DATA-13), so it
 * is calculated here. It used to count from a fixed date, and every product page
 * went on promising a delivery day that had already passed.
 */
function estimatedDeliveryFor(productIndex: number): string {
  return new Date(Date.now() + (3 + (productIndex % 4)) * DAY_MS).toISOString().slice(0, 10);
}

/** The wire shape, declared here rather than imported (MOD-01). */
export interface ProductDetailPayload {
  id: string;
  code: string;
  slug: string;
  name: string;
  description: string;
  type: 'SIMPLE' | 'SET';
  media: { url: string; alt: string }[];
  pieces: {
    id: string;
    code: string;
    name: string;
    position: number;
    fabric: {
      id: string;
      name: string;
      weight: 'LIGHT' | 'MEDIUM' | 'HEAVY';
      explainer: string;
      careText: string;
    };
    colour: { displayName: string; description: string; hex: string };
    sizes: { id: string; label: string }[];
    lengthMetres: number | null;
  }[];
  pricing: { currentMinor: number; originalMinor: number | null };
  isUnstitched: boolean;
  model: { heightCm: number; sizeWorn: string } | null;
  estimatedDeliveryDate: string;
  infoSections: { id: string; heading: string; body: string }[];
  fabricCalculator: {
    styles: { id: string; label: string }[];
    minHeightCm: number;
    maxHeightCm: number;
  } | null;
  /*
   * The offer BY VALUE, and DERIVED from the domain type so a new field on the
   * offer breaks here rather than being forgotten — an inline restatement is
   * exactly what let this drift. The style id loses its brand because this is
   * the WIRE shape: branding happens where the schema parses it, not here.
   */
  stitching: (Omit<StyleOffer, 'garmentStyle'> & { garmentStyle: string }) | null;
  isNew: boolean;
}

function sizeOptionsFor(record: CatalogueRecord, locale: Locale): { id: string; label: string }[] {
  // Unstitched fabric is sold by length, so it has no size set at all (§6.1:
  // `size_set_id` is nullable, and an empty list is that state on the wire).
  if (record.garmentType === 'unstitched') return [];

  // Size ids are shared across pieces: a "M" is one size of one SET (§6.1
  // `size_set_id`), and Inventory keys on the PAIR `(piece_id, size)` (§13), so
  // sharing is correct rather than lax. The set is the vocabulary's, so a saved
  // size (§28.3) names exactly the ids served here.
  return sizeOptionsOf(STANDARD_SIZE_SET, locale);
}

type PiecePayload = ProductDetailPayload['pieces'][number];

/** One product's pieces, each with its own fabric, colour copy and size set. */
function piecesFor(record: CatalogueRecord, locale: Locale, productIndex: number): PiecePayload[] {
  const colourDetail = COLOUR_DETAIL[record.colour] ?? COLOUR_DETAIL.ivory;

  return Array.from({ length: record.pieceCount }, (_, pieceIndex) => {
    // Each piece may be cut from a different fabric in a real set; the fixture
    // varies them so the interface cannot assume one fabric per product.
    const fabricKey = FABRICS[(productIndex + pieceIndex) % FABRICS.length] ?? 'cotton';
    const pieceFabric = FABRIC_DETAIL[fabricKey] ?? FABRIC_DETAIL.cotton;

    return {
      id: mockId('1111', productIndex * 10 + pieceIndex + 1),
      code: `${record.code}-P${String(pieceIndex + 1)}`,
      name: PIECE_NAMES[locale][record.garment]?.[pieceIndex] ?? 'Piece',
      position: pieceIndex,
      fabric: {
        id: mockId('3333', FABRICS.indexOf(fabricKey) + 1),
        name: vocabularyLabel(locale, fabricKey),
        weight: pieceFabric?.weight ?? 'LIGHT',
        explainer: pieceFabric?.explainer[locale] ?? '',
        careText: pieceFabric?.careText[locale] ?? '',
      },
      colour: {
        displayName: vocabularyLabel(locale, record.colour),
        description: colourDetail?.description[locale] ?? '',
        hex: colourDetail?.hex ?? '#cccccc',
      },
      sizes: sizeOptionsFor(record, locale),
      // §12 invariant: unstitched pieces carry their length; stitched do not.
      lengthMetres: record.garmentType === 'unstitched' ? record.metreage : null,
    };
  });
}

/** Stands in for backend-authored copy, per locale (§21). */
function descriptionFor(record: CatalogueRecord, locale: Locale): string {
  const label = (key: string): string => vocabularyLabel(locale, key);

  return locale === 'en'
    ? `${productNameFor(record, locale)} in ${label(record.colour)} ${label(record.fabric)}, cut for everyday wear.`
    : `${label(record.colour)} ${label(record.fabric)} میں ${label(record.garment)}، روزمرہ پہننے کے لیے۔`;
}

/**
 * EVERY frame the garment has, which is the same set the catalogue card cycles —
 * `frameUrls` is the one place that knows how many there are, so the card and
 * the product page cannot disagree (PD-01).
 *
 * This used to be a single shot, and the comment explaining why outlived the
 * fact: when the client's photography arrived there genuinely was one frame per
 * garment, and repeating another product's picture to pad a gallery would have
 * been a lie told by the fixture. Since then each garment has four further views
 * cropped from its own collage, so the gallery showing one of five was simply
 * hiding the other four.
 *
 * A11Y-04: the first frame names the garment; the rest are further views of
 * something the page already names, so an empty alt is correct rather than lazy
 * — and it is what `ProductGallery` expects.
 */
function mediaFor(record: CatalogueRecord, locale: Locale): ProductDetailPayload['media'] {
  return frameUrls(record.photo).map((url, position) => ({
    url,
    alt:
      position === 0
        ? `${vocabularyLabel(locale, record.colour)} ${vocabularyLabel(locale, record.garment)}`
        : '',
  }));
}

/** TS-08: an exported function declares its return type. */
export function toProductDetail(record: CatalogueRecord, locale: Locale): ProductDetailPayload {
  const isUnstitched = record.garmentType === 'unstitched';
  const productIndex = CATALOGUE.indexOf(record);

  return {
    id: record.id,
    code: record.code,
    slug: record.slug,
    name: productNameFor(record, locale),
    description: descriptionFor(record, locale),
    type: record.type,
    media: mediaFor(record, locale),
    pieces: piecesFor(record, locale, productIndex),
    pricing: { currentMinor: record.currentMinor, originalMinor: record.originalMinor },
    isUnstitched,
    // Unstitched lengths are not shot on a model, which is a real null rather
    // than missing data.
    model: isUnstitched ? null : { heightCm: 173, sizeWorn: 'M' },
    estimatedDeliveryDate: estimatedDeliveryFor(productIndex),
    infoSections: [...INFO_SECTIONS[locale]],
    fabricCalculator: fabricCalculatorOfferFor(record, locale),
    stitching: stitchingOfferForGarment(record.garment),
    isNew: record.isNew,
  };
}

export function findProductBySlug(slug: string, locale: Locale): ProductDetailPayload | null {
  const record = CATALOGUE.find((entry) => entry.slug === slug.trim());
  return record === undefined ? null : toProductDetail(record, locale);
}
