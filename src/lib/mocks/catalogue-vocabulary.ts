import type { Locale } from '@/i18n/locales';

/**
 * D1 — the catalogue's closed vocabularies and their labels, split out of
 * `catalogue-db.ts` (MOD-03).
 *
 * Fabric and work type are cycled by the fixture generator, so they are arrays.
 * Colour and garment are unions rather than `as const` arrays, because nothing
 * cycles them any more: both are read off the photograph. `VOCABULARY` below
 * stays the one place each value's label is written (SSOT-07 in spirit — this is
 * fixture data standing in for backend content).
 */

export const FABRICS = ['wash-n-wear', 'boski', 'karandi', 'cotton'] as const;
export const WORK_TYPES = ['plain', 'self-textured', 'contrast-trim', 'embroidered'] as const;

export type FabricKey = (typeof FABRICS)[number];
export type WorkKey = (typeof WORK_TYPES)[number];

export type ColourKey =
  | 'maroon'
  | 'emerald'
  | 'bottle'
  | 'olive'
  | 'walnut'
  | 'graphite'
  | 'stone'
  | 'ivory'
  | 'charcoal'
  | 'slate'
  | 'taupe'
  | 'rust'
  | 'navy'
  | 'camel'
  | 'black'
  | 'chocolate'
  | 'ash'
  | 'royal'
  | 'gold';

/**
 * Section 22: fabric and colour are closed vocabularies with fixed Urdu forms
 * from the protected-terms list. They are never machine translated — "Lawn"
 * must not become the word for grass — which is exactly why the backend sends
 * labels and the frontend never derives one from a value.
 */
const VOCABULARY: Record<Locale, Record<string, string>> = {
  en: {
    'wash-n-wear': 'Wash-n-wear',
    boski: 'Boski',
    karandi: 'Karandi',
    cotton: 'Cotton',
    maroon: 'Maroon',
    emerald: 'Emerald',
    bottle: 'Bottle Green',
    olive: 'Olive',
    walnut: 'Walnut',
    graphite: 'Graphite',
    stone: 'Stone',
    ivory: 'Ivory',
    charcoal: 'Charcoal',
    slate: 'Slate',
    taupe: 'Taupe',
    rust: 'Rust',
    navy: 'Navy',
    camel: 'Camel',
    black: 'Black',
    chocolate: 'Chocolate',
    ash: 'Ash Grey',
    royal: 'Royal Blue',
    gold: 'Antique Gold',
    plain: 'Plain',
    'self-textured': 'Self-textured',
    'contrast-trim': 'Contrast-trim',
    embroidered: 'Embroidered',
    waistcoat: 'Waistcoat Suit',
    kameez: 'Kameez Shalwar',
    kurta: 'Kurta',
    unstitched: 'Unstitched',
    stitched: 'Stitched',
    '1': 'One-piece',
    '2': 'Two-piece',
    '3': 'Three-piece',
  },
  ur: {
    'wash-n-wear': 'واش این ویئر',
    boski: 'بوسکی',
    karandi: 'کرنڈی',
    cotton: 'کاٹن',
    maroon: 'مرون',
    emerald: 'زمردی',
    bottle: 'گہرا سبز',
    olive: 'زیتونی',
    walnut: 'اخروٹی',
    graphite: 'سیاہی مائل سرمئی',
    stone: 'پتھری',
    ivory: 'عاجی',
    charcoal: 'سرمئی',
    slate: 'نیلگوں سرمئی',
    taupe: 'خاکی بھورا',
    rust: 'زنگی',
    navy: 'گہرا نیلا',
    camel: 'اونٹی',
    black: 'سیاہ',
    chocolate: 'چاکلیٹی',
    ash: 'راکھ سرمئی',
    royal: 'شاہی نیلا',
    gold: 'پرانا سنہری',
    plain: 'سادہ',
    'self-textured': 'سیلف',
    'contrast-trim': 'کنٹراسٹ',
    embroidered: 'کڑھائی',
    waistcoat: 'واسکٹ سوٹ',
    kameez: 'قمیض شلوار',
    kurta: 'کرتا',
    unstitched: 'بغیر سلے',
    stitched: 'سلے ہوئے',
    '1': 'ایک پیس',
    '2': 'ٹو پیس',
    '3': 'تھری پیس',
  },
};

export function vocabularyLabel(locale: Locale, key: string): string {
  return VOCABULARY[locale][key] ?? key;
}
