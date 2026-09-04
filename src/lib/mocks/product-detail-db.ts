import type { Locale } from '@/i18n/locales';

import { CATALOGUE, vocabularyLabel, type CatalogueRecord } from './catalogue-db';

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

const SIZE_LABELS: Record<Locale, readonly string[]> = {
  en: ['XS', 'S', 'M', 'L', 'XL'],
  // Sizes stay Latin in Urdu retail; they are read as codes, not words.
  ur: ['XS', 'S', 'M', 'L', 'XL'],
};

const PIECE_NAMES: Record<Locale, readonly string[]> = {
  en: ['Shirt', 'Trouser', 'Dupatta'],
  ur: ['قمیض', 'شلوار', 'دوپٹہ'],
};

interface FabricDetail {
  weight: 'LIGHT' | 'MEDIUM' | 'HEAVY';
  explainer: Record<Locale, string>;
  careText: Record<Locale, string>;
}

/** §6.3 — held once per fabric; a hundred lawn products share one care text. */
const FABRIC_DETAIL: Record<string, FabricDetail> = {
  lawn: {
    weight: 'LIGHT',
    explainer: {
      en: 'A fine, breathable cotton woven for hot weather.',
      ur: 'باریک، ہوادار کاٹن جو گرم موسم کے لیے بُنا جاتا ہے۔',
    },
    careText: {
      en: 'Machine wash cold on a gentle cycle. Line dry in shade. Warm iron.',
      ur: 'ٹھنڈے پانی میں ہلکی دھلائی۔ سائے میں سکھائیں۔ ہلکی استری کریں۔',
    },
  },
  chiffon: {
    weight: 'LIGHT',
    explainer: {
      en: 'A sheer, fluid weave that drapes rather than holds its shape.',
      ur: 'باریک، بہتا ہوا کپڑا جو اپنی ساخت رکھنے کے بجائے گرتا ہے۔',
    },
    careText: {
      en: 'Dry clean only. Do not wring. Cool iron with a pressing cloth.',
      ur: 'صرف ڈرائی کلین۔ نچوڑیں نہیں۔ کپڑا رکھ کر ٹھنڈی استری کریں۔',
    },
  },
  cotton: {
    weight: 'MEDIUM',
    explainer: {
      en: 'A sturdy everyday weave that softens with each wash.',
      ur: 'مضبوط روزمرہ کپڑا جو ہر دھلائی کے ساتھ نرم ہوتا ہے۔',
    },
    careText: {
      en: 'Machine wash warm. Tumble dry low. Iron while slightly damp.',
      ur: 'نیم گرم پانی میں دھوئیں۔ ہلکی گرمی میں سکھائیں۔ ہلکی نمی میں استری کریں۔',
    },
  },
  cambric: {
    weight: 'MEDIUM',
    explainer: {
      en: 'A closely woven cotton with a smooth finish and a little weight.',
      ur: 'گھنی بُنائی والا کاٹن، ہموار سطح اور ہلکے وزن کے ساتھ۔',
    },
    careText: {
      en: 'Machine wash cold. Line dry. Medium iron on the reverse.',
      ur: 'ٹھنڈے پانی میں دھوئیں۔ لٹکا کر سکھائیں۔ الٹی طرف سے درمیانی استری۔',
    },
  },
};

interface ColourDetail {
  hex: string;
  description: Record<Locale, string>;
}

/** §6.2 — `description` is copy the operator writes, not a generated string. */
const COLOUR_DETAIL: Record<string, ColourDetail> = {
  ivory: {
    hex: '#efe9dd',
    description: { en: 'A warm off-white with a soft cream cast.', ur: 'گرم سفیدی، ہلکی کریمی جھلک کے ساتھ۔' },
  },
  indigo: {
    hex: '#3b4a7a',
    description: { en: 'A deep blue with a quiet violet undertone.', ur: 'گہرا نیلا، ہلکی بنفشی جھلک کے ساتھ۔' },
  },
  rose: {
    hex: '#d9a3a8',
    description: { en: 'A dusty pink, muted rather than bright.', ur: 'دھیما گلابی، چمکدار نہیں۔' },
  },
  sage: {
    hex: '#a7b39a',
    description: { en: 'A soft muted green with a grey undertone.', ur: 'ہلکا سبز، سرمئی جھلک کے ساتھ۔' },
  },
  charcoal: {
    hex: '#3f4147',
    description: { en: 'A near-black grey that reads softer than black.', ur: 'سیاہی مائل سرمئی، کالے سے نرم۔' },
  },
  gold: {
    hex: '#c8a561',
    description: { en: 'A muted antique gold, not metallic.', ur: 'دھیما قدیم سنہری، دھاتی نہیں۔' },
  },
};

const INFO_SECTIONS: Record<Locale, readonly { id: string; heading: string; body: string }[]> = {
  en: [
    {
      id: 'fabric',
      heading: 'Fabric and care',
      body: 'Care instructions are held against the fabric, so every product woven from it is cared for the same way.',
    },
    {
      id: 'fit',
      heading: 'Fit',
      body: 'Cut to a regular fit through the shoulder and body. If you are between sizes, take the larger one.',
    },
    {
      id: 'delivery',
      heading: 'Delivery and returns',
      body: 'Delivered across Pakistan. Returns accepted within seven days, unworn and with tags attached.',
    },
    {
      id: 'origin',
      heading: 'Made in Pakistan',
      body: 'Cut and finished locally. Unstitched lengths are sold as woven, before any cutting.',
    },
  ],
  ur: [
    {
      id: 'fabric',
      heading: 'کپڑا اور دیکھ بھال',
      body: 'دیکھ بھال کی ہدایات کپڑے کے ساتھ رکھی جاتی ہیں، اس لیے اس سے بنی ہر چیز کی دیکھ بھال ایک جیسی ہے۔',
    },
    {
      id: 'fit',
      heading: 'فٹنگ',
      body: 'کندھے اور جسم پر ریگولر فٹ۔ اگر آپ دو سائز کے درمیان ہیں تو بڑا سائز لیں۔',
    },
    {
      id: 'delivery',
      heading: 'ترسیل اور واپسی',
      body: 'پورے پاکستان میں ترسیل۔ سات دن کے اندر واپسی، بغیر پہنے اور ٹیگ کے ساتھ۔',
    },
    {
      id: 'origin',
      heading: 'پاکستان میں تیار',
      body: 'مقامی طور پر تیار۔ بغیر سلے کپڑے کاٹنے سے پہلے، بُنی ہوئی حالت میں فروخت ہوتے ہیں۔',
    },
  ],
};

const MEDIA_COUNT = 4;
const DELIVERY_EPOCH = Date.parse('2026-09-11T00:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

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
  isNew: boolean;
}

const FABRIC_KEYS = ['lawn', 'chiffon', 'cotton', 'cambric'] as const;

function sizeOptionsFor(record: CatalogueRecord, locale: Locale): { id: string; label: string }[] {
  // Unstitched fabric is sold by length, so it has no size set at all (§6.1:
  // `size_set_id` is nullable, and an empty list is that state on the wire).
  if (record.garmentType === 'unstitched') return [];

  return SIZE_LABELS[locale].map((label, index) => ({
    // Size ids are shared across pieces: a "M" is one size, and Inventory keys
    // on the PAIR `(piece_id, size)` (§13), so sharing is correct rather than lax.
    id: mockId('2222', index + 1),
    label,
  }));
}

/** TS-08: an exported function declares its return type. */
export function toProductDetail(record: CatalogueRecord, locale: Locale): ProductDetailPayload {
  const isUnstitched = record.garmentType === 'unstitched';
  const colourDetail = COLOUR_DETAIL[record.colour] ?? COLOUR_DETAIL.ivory;
  const productIndex = CATALOGUE.indexOf(record);

  const pieces = Array.from({ length: record.pieceCount }, (_, pieceIndex) => {
    // Each piece may be cut from a different fabric in a real set; the fixture
    // varies them so the interface cannot assume one fabric per product.
    const fabricKey = FABRIC_KEYS[(productIndex + pieceIndex) % FABRIC_KEYS.length] ?? 'lawn';
    const pieceFabric = FABRIC_DETAIL[fabricKey] ?? FABRIC_DETAIL.lawn;

    return {
      id: mockId('1111', productIndex * 10 + pieceIndex + 1),
      code: `${record.code}-P${String(pieceIndex + 1)}`,
      name: PIECE_NAMES[locale][pieceIndex] ?? PIECE_NAMES[locale][0] ?? 'Piece',
      position: pieceIndex,
      fabric: {
        id: mockId('3333', FABRIC_KEYS.indexOf(fabricKey) + 1),
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
      lengthMetres: isUnstitched ? record.metreage : null,
    };
  });

  return {
    id: record.id,
    code: record.code,
    slug: record.slug,
    name: `${vocabularyLabel(locale, record.workType)} ${vocabularyLabel(locale, record.fabric)}`,
    description:
      locale === 'en'
        ? `${vocabularyLabel(locale, record.workType)} ${vocabularyLabel(locale, record.fabric)} in ${vocabularyLabel(locale, record.colour)}, cut for everyday wear.`
        : `${vocabularyLabel(locale, record.colour)} رنگ میں ${vocabularyLabel(locale, record.fabric)}، روزمرہ پہننے کے لیے۔`,
    type: record.type,
    media: Array.from({ length: MEDIA_COUNT }, (_, index) => ({
      url: `/placeholders/product-${String(((record.imageIndex + index - 1) % 4) + 1)}.avif`,
      // A11Y-04: authored alt text, not a generated one. The first shot names
      // the product; the rest are additional views of the same thing.
      alt: index === 0 ? `${vocabularyLabel(locale, record.fabric)}` : '',
    })),
    pieces,
    pricing: { currentMinor: record.currentMinor, originalMinor: record.originalMinor },
    isUnstitched,
    // Unstitched lengths are not shot on a model, which is a real null rather
    // than missing data.
    model: isUnstitched ? null : { heightCm: 173, sizeWorn: 'M' },
    estimatedDeliveryDate: new Date(DELIVERY_EPOCH + (productIndex % 4) * DAY_MS)
      .toISOString()
      .slice(0, 10),
    infoSections: [...INFO_SECTIONS[locale]],
    isNew: record.isNew,
  };
}

export function findProductBySlug(slug: string, locale: Locale): ProductDetailPayload | null {
  const record = CATALOGUE.find((entry) => entry.slug === slug.trim());
  return record === undefined ? null : toProductDetail(record, locale);
}

/** The availability wire shape, kept separate because it is a separate read. */
export interface ProductDetailAvailabilityPayload {
  productId: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'SOLD_OUT';
  pieces: {
    pieceId: string;
    status: 'IN_STOCK' | 'LOW_STOCK' | 'SOLD_OUT';
    sizes: { sizeId: string; status: 'IN_STOCK' | 'LOW_STOCK' | 'SOLD_OUT' }[];
  }[];
}

/**
 * The live overlay of architecture 8.2, at `(piece_id, size)` granularity.
 *
 * DATA-13 twice over. It reports a STATUS per size rather than a count, so "low
 * stock" stays a threshold the operator owns. And the product-level verdict is
 * stated here rather than left for the interface to derive: §16 makes a SET
 * unbuyable when ONE piece is gone, and that is the backend's rule to apply —
 * an interface that scanned the array and decided for itself would be a second
 * implementation of it.
 *
 * Deliberately uneven: some sizes are gone while the product is still buyable,
 * because §28.2 requires sold-out sizes to be SHOWN as sold out with Notify Me
 * rather than quietly omitted, and that state has to be reachable in the running
 * store rather than only in a test.
 */
export function productAvailabilityFor(
  productId: string,
  locale: Locale,
): ProductDetailAvailabilityPayload | null {
  const record = CATALOGUE.find((entry) => entry.id === productId.trim());
  if (record === undefined) return null;

  const detail = toProductDetail(record, locale);
  const productIndex = CATALOGUE.indexOf(record);

  const pieces = detail.pieces.map((piece, pieceIndex) => {
    // One piece of some SETs is gone entirely — the case §16 cares about.
    const pieceGone = !record.isInStock || (record.type === 'SET' && productIndex % 9 === 4 && pieceIndex === 1);

    const sizes = piece.sizes.map((size, sizeIndex) => {
      if (pieceGone) return { sizeId: size.id, status: 'SOLD_OUT' as const };

      // A scattered but fixed pattern, so a screenshot and a bug report agree.
      const soldOut = (productIndex + sizeIndex * 3 + pieceIndex) % 7 === 2;
      const low = (productIndex + sizeIndex) % 5 === 1;

      if (soldOut) return { sizeId: size.id, status: 'SOLD_OUT' as const };
      return { sizeId: size.id, status: low ? ('LOW_STOCK' as const) : ('IN_STOCK' as const) };
    });

    const everySizeGone = sizes.length > 0 && sizes.every((size) => size.status === 'SOLD_OUT');

    return {
      pieceId: piece.id,
      status: pieceGone || everySizeGone ? ('SOLD_OUT' as const) : ('IN_STOCK' as const),
      sizes,
    };
  });

  // The backend's verdict across the whole product, stated rather than derived
  // by whoever renders it.
  const anyPieceGone = pieces.some((piece) => piece.status === 'SOLD_OUT');
  const status = !record.isInStock || anyPieceGone ? 'SOLD_OUT' : record.id.endsWith('3') ? 'LOW_STOCK' : 'IN_STOCK';

  return { productId: record.id, status, pieces };
}
