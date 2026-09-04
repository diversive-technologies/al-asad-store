import type { Locale } from '@/i18n/locales';

/**
 * D1 — the catalogue fixture, large enough to exercise the things a four-item
 * fixture cannot: pagination, facet counts that actually vary, and filter
 * combinations that return nothing.
 *
 * Records here carry MORE than the wire shape. `launchedAt`, the filter keys and
 * the coarse stock flag are what a backend would hold and query on; the product
 * card projection sent to the client is derived from them. Keeping the two
 * distinct is the point — if the fixture were shaped exactly like the response,
 * it could not model filtering or sorting at all.
 */

const FABRICS = ['lawn', 'chiffon', 'cotton', 'cambric'] as const;
const COLOURS = ['ivory', 'indigo', 'rose', 'sage', 'charcoal', 'gold'] as const;
const WORK_TYPES = ['embroidered', 'printed', 'plain', 'hand-finished'] as const;

type FabricKey = (typeof FABRICS)[number];
type ColourKey = (typeof COLOURS)[number];
type WorkKey = (typeof WORK_TYPES)[number];

/**
 * Section 22: fabric and colour are closed vocabularies with fixed Urdu forms
 * from the protected-terms list. They are never machine translated — "Lawn"
 * must not become the word for grass — which is exactly why the backend sends
 * labels and the frontend never derives one from a value.
 */
const VOCABULARY: Record<Locale, Record<string, string>> = {
  en: {
    lawn: 'Lawn',
    chiffon: 'Chiffon',
    cotton: 'Cotton',
    cambric: 'Cambric',
    ivory: 'Ivory',
    indigo: 'Indigo',
    rose: 'Rose',
    sage: 'Sage',
    charcoal: 'Charcoal',
    gold: 'Gold',
    embroidered: 'Embroidered',
    printed: 'Printed',
    plain: 'Plain',
    'hand-finished': 'Hand-finished',
    unstitched: 'Unstitched',
    stitched: 'Stitched',
    '1': 'One-piece',
    '2': 'Two-piece',
    '3': 'Three-piece',
  },
  ur: {
    lawn: 'لان',
    chiffon: 'شفون',
    cotton: 'کاٹن',
    cambric: 'کیمبرک',
    ivory: 'عاجی',
    indigo: 'نیلا',
    rose: 'گلابی',
    sage: 'سبزہ',
    charcoal: 'سرمئی',
    gold: 'سنہری',
    embroidered: 'کڑھائی',
    printed: 'پرنٹڈ',
    plain: 'سادہ',
    'hand-finished': 'ہاتھ سے تیار',
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

export interface CatalogueRecord {
  id: string;
  code: string;
  slug: string;
  fabric: FabricKey;
  colour: ColourKey;
  workType: WorkKey;
  garmentType: 'unstitched' | 'stitched';
  /** DATA-13a: declared at creation, never inferred by counting rows. */
  type: 'SIMPLE' | 'SET';
  pieceCount: number;
  currentMinor: number;
  originalMinor: number | null;
  metreage: number | null;
  isNew: boolean;
  /** DATA-12: ISO-8601 on the wire; here it drives the NEWEST sort. */
  launchedAt: string;
  /**
   * A COARSE in-stock flag, and the distinction matters.
   *
   * Section 15 forbids reading stock from the index, yet section 28.1 requires
   * an "In stock only" filter — so the index carries this flag for FILTERING and
   * COUNTING only. It is eventually consistent and is never what the interface
   * shows a customer: the badge on a card comes from the live availability
   * overlay, which stays authoritative.
   */
  isInStock: boolean;
  imageIndex: number;
}

const TOTAL_PRODUCTS = 28;
const LAUNCH_EPOCH = Date.parse('2026-08-01T00:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Deterministic rather than random: the same fixture every run means a
 * screenshot, a facet count and a failing test all refer to the same catalogue.
 * The moduli are deliberately coprime with each other so attributes vary
 * independently instead of moving in lockstep.
 */
export const CATALOGUE: readonly CatalogueRecord[] = Array.from(
  { length: TOTAL_PRODUCTS },
  (_, index): CatalogueRecord => {
    const pieceCount = (index % 3) + 1;
    const fabric = FABRICS[index % FABRICS.length] ?? 'lawn';
    const colour = COLOURS[(index * 5) % COLOURS.length] ?? 'ivory';
    const workType = WORK_TYPES[(index * 3) % WORK_TYPES.length] ?? 'plain';
    const garmentType = pieceCount === 1 && index % 2 === 0 ? 'unstitched' : 'stitched';
    const currentMinor = 349_900 + ((index * 187_000) % 1_750_000);
    const isDiscounted = index % 4 === 1;

    return {
      id: `7d1f0a2c-9b4e-4c8a-8f21-${String(index + 1).padStart(12, '0')}`,
      code: `AA-${String(1000 + index)}`,
      slug: `${workType}-${fabric}-${colour}-${String(index + 1)}`,
      fabric,
      colour,
      workType,
      garmentType,
      // DATA-13a: SIMPLE or SET is declared here, and piece count follows it.
      type: pieceCount === 1 ? 'SIMPLE' : 'SET',
      pieceCount,
      currentMinor,
      originalMinor: isDiscounted ? Math.round(currentMinor * 1.35) : null,
      metreage: garmentType === 'unstitched' ? 2.5 + (index % 3) * 0.5 : null,
      isNew: index % 5 === 0,
      launchedAt: new Date(LAUNCH_EPOCH - index * DAY_MS).toISOString(),
      // Roughly one in seven is out of stock, so empty states are reachable.
      isInStock: index % 7 !== 3,
      imageIndex: (index % 4) + 1,
    };
  },
);

/**
 * The wire shape — deliberately narrower than the record above.
 *
 * Declared here rather than imported from the catalogue feature: MOD-01 forbids
 * `lib/` importing from `features/`, and the separation is faithful anyway. The
 * Java service will declare its own DTO; what binds the two is the Zod schema
 * this payload has to survive at the boundary (DATA-02).
 */
export interface ProductCardPayload {
  id: string;
  slug: string;
  name: string;
  type: 'SIMPLE' | 'SET';
  pieceCount: number;
  imageUrl: string;
  hoverImageUrl: string | null;
  workType: string;
  fabricName: string;
  colourName: string;
  pricing: { currentMinor: number; originalMinor: number | null };
  metreage: number | null;
  isNew: boolean;
}

/** TS-08: an exported function declares its return type. */
export function toProductCard(record: CatalogueRecord, locale: Locale): ProductCardPayload {
  return {
    id: record.id,
    slug: record.slug,
    // Stands in for a backend-authored, per-locale product name. Assembling it
    // here is fixture generation, not interface copy (I18N-06 governs the latter).
    name: `${vocabularyLabel(locale, record.workType)} ${vocabularyLabel(locale, record.fabric)}`,
    type: record.type,
    pieceCount: record.pieceCount,
    imageUrl: `/placeholders/product-${String(record.imageIndex)}.avif`,
    /*
     * Every product carries a hover image. The contract keeps this nullable
     * because a real catalogue will have products shot only once, but giving
     * only half the fixture one made the grid look broken rather than varied —
     * hovering appeared to work at random.
     */
    hoverImageUrl: `/placeholders/product-${String((record.imageIndex % 4) + 1)}.avif`,
    workType: vocabularyLabel(locale, record.workType),
    fabricName: vocabularyLabel(locale, record.fabric),
    colourName: vocabularyLabel(locale, record.colour),
    pricing: { currentMinor: record.currentMinor, originalMinor: record.originalMinor },
    metreage: record.metreage,
    isNew: record.isNew,
  };
}
