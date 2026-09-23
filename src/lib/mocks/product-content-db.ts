import type { Locale } from '@/i18n/locales';

/**
 * D1 — the product page's authored CONTENT, split out of `product-detail-db.ts`
 * (MOD-03): size labels, piece names, fabric and colour copy, and the info
 * sections. Nothing here decides stock, price or eligibility; it is the words
 * and swatches the operator writes, held per locale because §21 and §22 serve
 * them per locale.
 */

export const SIZE_LABELS: Record<Locale, readonly string[]> = {
  en: ['XS', 'S', 'M', 'L', 'XL'],
  // Sizes stay Latin in Urdu retail; they are read as codes, not words.
  ur: ['XS', 'S', 'M', 'L', 'XL'],
};

/**
 * §6.1 — the ONE size of a piece with no size set.
 *
 * `size_set_id` is nullable for a one-size piece, and a one-piece unstitched
 * length is the commonest one: "sold in one size, with one stock figure" (§2).
 * The product projection shows no size set for it (`sizes: []`), so a customer
 * is never asked to choose — but Inventory still keys EVERY stock row on
 * `(piece_id, size)` (§13), so that one stock figure needs a size to be keyed on.
 * This is it. The cart resolves it itself (§7.1 step 1, "resolve the piece/size
 * keys for every piece of the product"), and it is what a bag line and an order
 * name the piece's size as.
 */
export const ONE_SIZE = {
  id: 'a1b2c3d4-2222-4c8a-8f21-000000000000',
  label: { en: 'One size', ur: 'ایک سائز' } satisfies Record<Locale, string>,
} as const;

/** A piece's size as a bag line and an order name it, including the one size of a sizeless piece. */
export function sizeLabelOf(
  piece: { sizes: readonly { id: string; label: string }[] },
  sizeId: string,
  locale: Locale,
): string | null {
  if (piece.sizes.length === 0) return sizeId === ONE_SIZE.id ? ONE_SIZE.label[locale] : null;
  return piece.sizes.find((size) => size.id === sizeId)?.label ?? null;
}

/**
 * Piece names belong to the GARMENT, not to a position in a list.
 *
 * A flat `['Shirt', 'Trouser', 'Dupatta']` indexed by position was fine while
 * every SET was a women's suit. With a three-piece waistcoat suit and a
 * two-piece kameez shalwar in the same catalogue, position 0 is "Waistcoat" in
 * one and "Kameez" in the other, and indexing the same array would have named
 * the two-piece suit's first piece "Waistcoat".
 */
export const PIECE_NAMES: Record<Locale, Record<string, readonly string[]>> = {
  en: {
    waistcoat: ['Waistcoat', 'Kameez', 'Shalwar'],
    kameez: ['Kameez', 'Shalwar'],
    kurta: ['Kurta'],
  },
  ur: {
    waistcoat: ['واسکٹ', 'قمیض', 'شلوار'],
    kameez: ['قمیض', 'شلوار'],
    kurta: ['کرتا'],
  },
};

interface FabricDetail {
  weight: 'LIGHT' | 'MEDIUM' | 'HEAVY';
  explainer: Record<Locale, string>;
  careText: Record<Locale, string>;
}

/** §6.3 — held once per fabric; a hundred boski products share one care text. */
export const FABRIC_DETAIL: Record<string, FabricDetail> = {
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
export const COLOUR_DETAIL: Record<string, ColourDetail> = {
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

export const INFO_SECTIONS: Record<
  Locale,
  readonly { id: string; heading: string; body: string }[]
> = {
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
