import type { Locale } from '@/i18n/locales';

import { CATALOGUE, frameUrls, vocabularyLabel, type CatalogueRecord } from './catalogue-db';

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

/**
 * Piece names belong to the GARMENT, not to a position in a list.
 *
 * A flat `['Shirt', 'Trouser', 'Dupatta']` indexed by position was fine while
 * every SET was a women's suit. With a three-piece waistcoat suit and a
 * two-piece kameez shalwar in the same catalogue, position 0 is "Waistcoat" in
 * one and "Kameez" in the other, and indexing the same array would have named
 * the two-piece suit's first piece "Waistcoat".
 */
const PIECE_NAMES: Record<Locale, Record<string, readonly string[]>> = {
  en: {
    waistcoat: ['Waistcoat', 'Kameez', 'Shalwar'],
    kameez: ['Kameez', 'Shalwar'],
    kurta: ['Kurta'],
    'boys-kurta': ['Kurta'],
  },
  ur: {
    waistcoat: ['واسکٹ', 'قمیض', 'شلوار'],
    kameez: ['قمیض', 'شلوار'],
    kurta: ['کرتا'],
    'boys-kurta': ['کرتا'],
  },
};

interface FabricDetail {
  weight: 'LIGHT' | 'MEDIUM' | 'HEAVY';
  explainer: Record<Locale, string>;
  careText: Record<Locale, string>;
}

/** §6.3 — held once per fabric; a hundred boski products share one care text. */
const FABRIC_DETAIL: Record<string, FabricDetail> = {
  'wash-n-wear': {
    weight: 'MEDIUM',
    explainer: {
      en: 'A blended weave that keeps its press and needs little ironing.',
      ur: 'ملواں بُنائی جو استری برقرار رکھتی ہے اور کم استری مانگتی ہے۔',
    },
    careText: {
      en: 'Machine wash warm. Drip dry on a hanger. Warm iron if needed.',
      ur: 'نیم گرم پانی میں دھوئیں۔ ہینگر پر سکھائیں۔ ضرورت ہو تو ہلکی استری۔',
    },
  },
  boski: {
    weight: 'LIGHT',
    explainer: {
      en: 'A soft silk-finish cloth with a quiet sheen, worn for occasions.',
      ur: 'نرم ریشمی سطح والا کپڑا، ہلکی چمک کے ساتھ، خاص مواقع کے لیے۔',
    },
    careText: {
      en: 'Dry clean only. Do not wring. Cool iron on the reverse.',
      ur: 'صرف ڈرائی کلین۔ نچوڑیں نہیں۔ الٹی طرف سے ٹھنڈی استری۔',
    },
  },
  karandi: {
    weight: 'HEAVY',
    explainer: {
      en: 'A textured winter weave with a little weight and a matte surface.',
      ur: 'سردیوں کا بُنا ہوا کپڑا، ہلکے وزن اور بغیر چمک والی سطح کے ساتھ۔',
    },
    careText: {
      en: 'Dry clean preferred. If washed, use cold water and dry flat.',
      ur: 'ڈرائی کلین بہتر ہے۔ دھونا ہو تو ٹھنڈا پانی، اور بچھا کر سکھائیں۔',
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
};

interface ColourDetail {
  hex: string;
  description: Record<Locale, string>;
}

/** §6.2 — `description` is copy the operator writes, not a generated string. */
const COLOUR_DETAIL: Record<string, ColourDetail> = {
  maroon: {
    hex: '#5c2b38',
    description: {
      en: 'A deep wine red, closer to brown than to scarlet.',
      ur: 'گہرا مرون، سرخ سے زیادہ بھورے کی طرف۔',
    },
  },
  emerald: {
    hex: '#3c5a3a',
    description: {
      en: 'A rich mid green with a warm undertone.',
      ur: 'گہرا سبز، گرم جھلک کے ساتھ۔',
    },
  },
  bottle: {
    hex: '#26382c',
    description: {
      en: 'A very dark green that reads almost black indoors.',
      ur: 'بہت گہرا سبز، اندر تقریباً کالا لگتا ہے۔',
    },
  },
  olive: {
    hex: '#5b6340',
    description: { en: 'A muted green with a khaki cast.', ur: 'دھیما سبز، خاکی جھلک کے ساتھ۔' },
  },
  walnut: {
    hex: '#4c352b',
    description: {
      en: 'A warm dark brown, like polished wood.',
      ur: 'گرم گہرا بھورا، پالش شدہ لکڑی جیسا۔',
    },
  },
  graphite: {
    hex: '#585d63',
    description: {
      en: 'A mid grey with a cool, slightly blue cast.',
      ur: 'درمیانہ سرمئی، ہلکی نیلی جھلک کے ساتھ۔',
    },
  },
  stone: {
    hex: '#b4a99c',
    description: { en: 'A pale warm grey, softer than beige.', ur: 'ہلکا گرم سرمئی، بیج سے نرم۔' },
  },
  ivory: {
    hex: '#efe9dd',
    description: {
      en: 'A warm off-white with a soft cream cast.',
      ur: 'گرم سفیدی، ہلکی کریمی جھلک کے ساتھ۔',
    },
  },
  charcoal: {
    hex: '#3f4147',
    description: {
      en: 'A near-black grey that reads softer than black.',
      ur: 'سیاہی مائل سرمئی، کالے سے نرم۔',
    },
  },
  slate: {
    hex: '#59637d',
    description: {
      en: 'A dusty blue-grey, muted rather than bright.',
      ur: 'دھیما نیلا سرمئی، چمکدار نہیں۔',
    },
  },
  taupe: {
    hex: '#9c8878',
    description: {
      en: 'A soft grey-brown that sits between beige and mocha.',
      ur: 'نرم سرمئی بھورا، بیج اور کافی کے درمیان۔',
    },
  },
  rust: {
    hex: '#a55f2c',
    description: {
      en: 'A warm burnt orange with a brown depth.',
      ur: 'گرم زنگی نارنجی، بھوری گہرائی کے ساتھ۔',
    },
  },
  navy: {
    hex: '#22304d',
    description: {
      en: 'A deep blue, dark enough to pass for black at night.',
      ur: 'گہرا نیلا، رات میں تقریباً کالا لگتا ہے۔',
    },
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

const DELIVERY_EPOCH = Date.parse('2026-09-11T00:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * ## The mock backend's stock ledger
 *
 * §13 keys inventory on `(piece_id, size)` for every product, SIMPLE or SET
 * alike. This is that table, and it is the ONE place a quantity is decided.
 *
 * It exists because §7.1 cannot be modelled honestly without it. A reservation
 * transaction that guarantees "no oversell under concurrency" needs something
 * to oversell — a status pattern computed on the fly has no number to run out
 * of, so `Unavailable(piece)` could never actually fire and the interface's
 * whole failure path would be untestable in the running store.
 *
 * The availability overlay now reads from here too, so the sold-out sizes the
 * product page shows and the sizes the bag will refuse are the same fact rather
 * than two rules that agree until someone edits one (PD-01).
 *
 * Quantities stay small on purpose: eight units is enough to add repeatedly,
 * and two is enough that a customer can take the last one and watch the size go
 * sold out.
 */
const LOW_STOCK_AT = 2;
const STOCKED_QUANTITY = 8;

/** The `(piece_id, size)` key of §13, as one string. */
export function stockKey(pieceId: string, sizeId: string): string {
  return `${pieceId}:${sizeId}`;
}

/**
 * DATA-13: "low stock" is a THRESHOLD the operator owns, so it is applied here
 * in the mock backend and the number never crosses the wire (§12 carries no
 * quantity field of any kind).
 */
export function statusForQuantity(quantity: number): 'IN_STOCK' | 'LOW_STOCK' | 'SOLD_OUT' {
  if (quantity <= 0) return 'SOLD_OUT';
  return quantity <= LOW_STOCK_AT ? 'LOW_STOCK' : 'IN_STOCK';
}

/** How much a cart other than this read is holding against a key (§7.3). */
export type ReservedLookup = (pieceId: string, sizeId: string) => number;

const NOTHING_RESERVED: ReservedLookup = () => 0;

/**
 * Built on FIRST USE, not at module load.
 *
 * Filling it eagerly means calling `toProductDetail` while this module is still
 * evaluating, which reaches `FABRIC_KEYS` before its `const` is initialised —
 * a temporal-dead-zone `ReferenceError` that takes the whole module with it.
 * Deferring to first access also means a request that never touches stock never
 * pays to build the table.
 */
let stockOnHand: Map<string, number> | null = null;

function stockTable(): Map<string, number> {
  if (stockOnHand !== null) return stockOnHand;

  const table = new Map<string, number>();

  CATALOGUE.forEach((record, productIndex) => {
    toProductDetail(record, 'en').pieces.forEach((piece, pieceIndex) => {
      piece.sizes.forEach((size, sizeIndex) => {
        // One piece of some SETs is gone entirely — the case §16 cares about.
        const pieceGone =
          !record.isInStock ||
          (record.type === 'SET' && productIndex % 9 === 4 && pieceIndex === 1);
        // A scattered but fixed pattern, so a screenshot and a bug report agree.
        const soldOut = (productIndex + sizeIndex * 3 + pieceIndex) % 7 === 2;
        const low = (productIndex + sizeIndex) % 5 === 1;

        const quantity = pieceGone || soldOut ? 0 : low ? LOW_STOCK_AT : STOCKED_QUANTITY;
        table.set(stockKey(piece.id, size.id), quantity);
      });
    });
  });

  stockOnHand = table;
  return table;
}

/** `on_hand` for one `(piece, size)`. Unknown keys hold nothing. */
export function onHandFor(pieceId: string, sizeId: string): number {
  return stockTable().get(stockKey(pieceId, sizeId)) ?? 0;
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
  isNew: boolean;
}

const FABRIC_KEYS = ['wash-n-wear', 'boski', 'karandi', 'cotton'] as const;

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
    const fabricKey = FABRIC_KEYS[(productIndex + pieceIndex) % FABRIC_KEYS.length] ?? 'cotton';
    const pieceFabric = FABRIC_DETAIL[fabricKey] ?? FABRIC_DETAIL.cotton;

    return {
      id: mockId('1111', productIndex * 10 + pieceIndex + 1),
      code: `${record.code}-P${String(pieceIndex + 1)}`,
      name: PIECE_NAMES[locale][record.garment]?.[pieceIndex] ?? 'Piece',
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
    name: `${vocabularyLabel(locale, record.workType)} ${vocabularyLabel(locale, record.garment)}`,
    description:
      locale === 'en'
        ? `${vocabularyLabel(locale, record.workType)} ${vocabularyLabel(locale, record.garment)} in ${vocabularyLabel(locale, record.colour)} ${vocabularyLabel(locale, record.fabric)}, cut for everyday wear.`
        : `${vocabularyLabel(locale, record.colour)} ${vocabularyLabel(locale, record.fabric)} میں ${vocabularyLabel(locale, record.garment)}، روزمرہ پہننے کے لیے۔`,
    type: record.type,
    /*
     * EVERY frame the garment has, which is the same set the catalogue card
     * cycles — `frameUrls` is the one place that knows how many there are, so
     * the card and the product page cannot disagree (PD-01).
     *
     * This used to be a single shot, and the comment explaining why outlived
     * the fact: when the client's photography arrived there genuinely was one
     * frame per garment, and repeating another product's picture to pad a
     * gallery would have been a lie told by the fixture. Since then each
     * garment has four further views cropped from its own collage, so the
     * gallery showing one of five was simply hiding the other four.
     *
     * A11Y-04: the first frame names the garment; the rest are further views of
     * something the page already names, so an empty alt is correct rather than
     * lazy — and it is what `ProductGallery` expects.
     */
    media: frameUrls(record.photo).map((url, position) => ({
      url,
      alt:
        position === 0
          ? `${vocabularyLabel(locale, record.colour)} ${vocabularyLabel(locale, record.garment)}`
          : '',
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
    fabricCalculator: fabricCalculatorOfferFor(record, locale),
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
  reservedFor: ReservedLookup = NOTHING_RESERVED,
): ProductDetailAvailabilityPayload | null {
  const record = CATALOGUE.find((entry) => entry.id === productId.trim());
  if (record === undefined) return null;

  const detail = toProductDetail(record, locale);

  const pieces = detail.pieces.map((piece) => {
    const sizes = piece.sizes.map((size) => {
      /*
       * §7.3 read-time exclusion, at the one place a customer sees stock: what
       * is on the shelf MINUS what other carts are holding right now. Nothing
       * had to expire for this to be right, and no sweeper had to run.
       */
      const available = onHandFor(piece.id, size.id) - reservedFor(piece.id, size.id);
      return { sizeId: size.id, status: statusForQuantity(available) };
    });

    const everySizeGone = sizes.length > 0 && sizes.every((size) => size.status === 'SOLD_OUT');
    const pieceGone = !record.isInStock || everySizeGone;

    return {
      pieceId: piece.id,
      status: pieceGone ? ('SOLD_OUT' as const) : ('IN_STOCK' as const),
      sizes,
    };
  });

  // The backend's verdict across the whole product, stated rather than derived
  // by whoever renders it. §16: a SET is unbuyable when ONE piece is gone.
  const anyPieceGone = pieces.some((piece) => piece.status === 'SOLD_OUT');
  const status =
    !record.isInStock || anyPieceGone
      ? 'SOLD_OUT'
      : record.id.endsWith('3')
        ? 'LOW_STOCK'
        : 'IN_STOCK';

  return { productId: record.id, status, pieces };
}

/**
 * §25's requirement table, standing in for the backend module that owns it.
 *
 * The table is the whole feature: metres required per height band and garment
 * style. It lives HERE and not in the frontend because §25 makes it a backend
 * module — the interface asks and renders, it does not subtract. The margin
 * below is the configured threshold that separates "comfortable" from "just
 * enough", and it is a commercial setting the operator tunes.
 */
const GARMENT_STYLES: Record<Locale, readonly { id: string; label: string }[]> = {
  en: [
    { id: 'kameez-shalwar', label: 'Kameez and shalwar' },
    { id: 'long-kameez', label: 'Long kameez' },
    { id: 'short-kurta', label: 'Short kurta' },
  ],
  ur: [
    { id: 'kameez-shalwar', label: 'قمیض اور شلوار' },
    { id: 'long-kameez', label: 'لمبی قمیض' },
    { id: 'short-kurta', label: 'چھوٹا کرتا' },
  ],
};

const MIN_HEIGHT_CM = 140;
const MAX_HEIGHT_CM = 200;

/** Metres required at the shortest height, plus metres per cm of extra height. */
const REQUIREMENT: Record<string, { base: number; perCm: number }> = {
  'kameez-shalwar': { base: 4.4, perCm: 0.012 },
  'long-kameez': { base: 3.3, perCm: 0.009 },
  'short-kurta': { base: 2.4, perCm: 0.006 },
};

/** Below this surplus, §25 says the answer is JustEnough rather than Comfortable. */
const COMFORT_MARGIN_METRES = 0.3;

export function fabricCalculatorOfferFor(
  record: CatalogueRecord,
  locale: Locale,
): { styles: { id: string; label: string }[]; minHeightCm: number; maxHeightCm: number } | null {
  // §25: offered only for products with at least one unstitched piece. The
  // backend decides this; the frontend renders whatever it is told.
  if (record.garmentType !== 'unstitched') return null;

  return {
    styles: [...GARMENT_STYLES[locale]],
    minHeightCm: MIN_HEIGHT_CM,
    maxHeightCm: MAX_HEIGHT_CM,
  };
}

export type FabricVerdictPayload =
  | { kind: 'COMFORTABLE'; spareMetres: number }
  | { kind: 'JUST_ENOUGH' }
  | { kind: 'INSUFFICIENT'; shortfallMetres: number };

/** §25 `evaluate(product_id, height_cm, style)`. A lookup and a subtraction. */
export function evaluateFabric(
  productId: string,
  heightCm: number,
  styleId: string,
): FabricVerdictPayload | null {
  const record = CATALOGUE.find((entry) => entry.id === productId);
  const requirement = REQUIREMENT[styleId];

  if (record === undefined || requirement === undefined) return null;
  if (record.metreage === null) return null;

  const clamped = Math.min(Math.max(heightCm, MIN_HEIGHT_CM), MAX_HEIGHT_CM);
  const required = requirement.base + (clamped - MIN_HEIGHT_CM) * requirement.perCm;
  // Rounded to centimetres of cloth; a figure like 0.30000000000000004 helps
  // nobody and would render as noise.
  const surplus = Math.round((record.metreage - required) * 100) / 100;

  if (surplus < 0) return { kind: 'INSUFFICIENT', shortfallMetres: Math.abs(surplus) };
  if (surplus < COMFORT_MARGIN_METRES) return { kind: 'JUST_ENOUGH' };

  return { kind: 'COMFORTABLE', spareMetres: surplus };
}
