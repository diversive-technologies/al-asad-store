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

const FABRICS = ['wash-n-wear', 'boski', 'karandi', 'cotton'] as const;
const WORK_TYPES = ['plain', 'self-textured', 'contrast-trim', 'embroidered'] as const;

type FabricKey = (typeof FABRICS)[number];
type WorkKey = (typeof WORK_TYPES)[number];

/*
 * Colour and garment are unions rather than `as const` arrays, because nothing
 * cycles them any more: both are read off the photograph. `VOCABULARY` below
 * stays the one place each value's label is written (SSOT-07 in spirit — this
 * is fixture data standing in for backend content).
 */
type ColourKey =
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
  | 'navy';

type GarmentKey = 'waistcoat' | 'kameez' | 'kurta' | 'boys-kurta';

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
    plain: 'Plain',
    'self-textured': 'Self-textured',
    'contrast-trim': 'Contrast-trim',
    embroidered: 'Embroidered',
    waistcoat: 'Waistcoat Suit',
    kameez: 'Kameez Shalwar',
    kurta: 'Kurta',
    'boys-kurta': 'Boys Kurta',
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
    plain: 'سادہ',
    'self-textured': 'سیلف',
    'contrast-trim': 'کنٹراسٹ',
    embroidered: 'کڑھائی',
    waistcoat: 'واسکٹ سوٹ',
    kameez: 'قمیض شلوار',
    kurta: 'کرتا',
    'boys-kurta': 'بچوں کا کرتا',
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

/**
 * The client's own photography, in `public/products/`.
 *
 * Every attribute a customer can SEE in the picture is read from this table
 * rather than computed from the product index — colour, and which garment it is.
 * That is the whole point: a generated fixture is free to call a product
 * "Slate", but if the photograph shows a maroon waistcoat then the card is
 * lying, and no amount of filter correctness makes a lying card acceptable.
 *
 * Attributes the picture does NOT settle — fabric, work type, price, launch
 * date — stay generated, so filtering and sorting still have something to vary.
 */
interface Photograph {
  readonly file: string;
  readonly colour: ColourKey;
  readonly garment: GarmentKey;
  /**
   * How many frames exist for this garment, including the original.
   *
   * One today: the client sent a single photograph per garment. Additional
   * frames arrive as `<file>-2.avif`, `-3` and so on — the same garment at a
   * different distance or angle — and adding them is bumping this number, not
   * editing a component. `frameUrls` below is the only place the naming lives.
   */
  readonly frames?: number;
}

/**
 * Five frames per garment: the client's own photograph, plus four generated
 * views of the SAME garment — full length, three-quarter, side profile and a
 * collar detail — cropped from one 2x2 collage each.
 *
 * They are generated, and that is worth knowing rather than discovering: they
 * are consistent with the real photograph and with each other, but they are not
 * a second photo shoot. Real alternate angles replace them file-for-file.
 */
const FRAMES = 5;

const PHOTOGRAPHY: readonly Photograph[] = [
  { file: 'waistcoat-maroon', colour: 'maroon', garment: 'waistcoat', frames: FRAMES },
  { file: 'waistcoat-emerald', colour: 'emerald', garment: 'waistcoat', frames: FRAMES },
  { file: 'waistcoat-bottle', colour: 'bottle', garment: 'waistcoat', frames: FRAMES },
  { file: 'waistcoat-olive', colour: 'olive', garment: 'waistcoat', frames: FRAMES },
  { file: 'waistcoat-walnut', colour: 'walnut', garment: 'waistcoat', frames: FRAMES },
  { file: 'waistcoat-graphite', colour: 'graphite', garment: 'waistcoat', frames: FRAMES },
  { file: 'waistcoat-stone', colour: 'stone', garment: 'waistcoat', frames: FRAMES },
  { file: 'waistcoat-ivory', colour: 'ivory', garment: 'waistcoat', frames: FRAMES },
  { file: 'kameez-charcoal', colour: 'charcoal', garment: 'kameez', frames: FRAMES },
  { file: 'kameez-slate', colour: 'slate', garment: 'kameez', frames: FRAMES },
  { file: 'kameez-taupe', colour: 'taupe', garment: 'kameez', frames: FRAMES },
  { file: 'kurta-rust', colour: 'rust', garment: 'kurta', frames: FRAMES },
  { file: 'boys-kurta-charcoal', colour: 'charcoal', garment: 'boys-kurta', frames: FRAMES },
  { file: 'boys-kurta-navy', colour: 'navy', garment: 'boys-kurta', frames: FRAMES },
];

/**
 * §6.1 — piece count follows the garment, and the garment is what was
 * photographed. A waistcoat suit is the three-piece case the SET model exists
 * for: waistcoat, kameez and shalwar, each sized and stocked on its own.
 */
const PIECES: Record<GarmentKey, number> = {
  waistcoat: 3,
  kameez: 2,
  kurta: 1,
  'boys-kurta': 1,
};

export function photoUrl(file: string): string {
  return `/products/${file}.avif`;
}

/**
 * Every frame for a garment, first one first.
 *
 * The card rests on `[0]`, advances through the rest on hover, and its
 * previous/next controls walk the same list.
 */
export function frameUrls(photo: Photograph): string[] {
  const total = photo.frames ?? 1;
  return Array.from({ length: total }, (_, index) =>
    photoUrl(index === 0 ? photo.file : `${photo.file}-${String(index + 1)}`),
  );
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
  /** Which of the client's photographs this product is. */
  photo: Photograph;
  garment: GarmentKey;
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
    /*
     * 28 products over 14 photographs, so each garment appears twice — offered
     * in two different cloths, which is how this catalogue actually works. The
     * two instances land on different fabrics because 14 and 4 put them two
     * apart in the fabric cycle, and they never disagree about COLOUR, because
     * colour is read from the photograph both times.
     */
    const photo = PHOTOGRAPHY[index % PHOTOGRAPHY.length] ?? PHOTOGRAPHY[0];
    if (photo === undefined) throw new Error('PHOTOGRAPHY must not be empty.');

    const pieceCount = PIECES[photo.garment];
    const fabric = FABRICS[index % FABRICS.length] ?? 'cotton';
    const colour = photo.colour;
    const workType = WORK_TYPES[(index * 3) % WORK_TYPES.length] ?? 'plain';
    /*
     * The adult kurta is the unstitched line. Tying this to the garment rather
     * than to `index % 2` is what keeps it sane now that photography drives the
     * fixture: the old parity rule would have made an UNSTITCHED product out of
     * whichever photograph happened to land on an even index, and the two that
     * did were the boys' kurtas.
     */
    const garmentType = photo.garment === 'kurta' ? 'unstitched' : 'stitched';
    const currentMinor = 349_900 + ((index * 187_000) % 1_750_000);
    const isDiscounted = index % 4 === 1;

    return {
      id: `7d1f0a2c-9b4e-4c8a-8f21-${String(index + 1).padStart(12, '0')}`,
      code: `AA-${String(1000 + index)}`,
      slug: `${fabric}-${photo.garment}-${colour}-${String(index + 1)}`,
      fabric,
      colour,
      workType,
      garmentType,
      // DATA-13a: SIMPLE or SET is declared here, and piece count follows it.
      type: pieceCount === 1 ? 'SIMPLE' : 'SET',
      pieceCount,
      currentMinor,
      originalMinor: isDiscounted ? Math.round(currentMinor * 1.35) : null,
      /*
       * Spread deliberately, and checked against the unstitched indices rather
       * than assumed. All three Fabric Calculator verdicts have to be reachable
       * from a product page: a fixture that cannot produce one of a feature's
       * three outcomes hides it from every screenshot and every review. The two
       * unstitched products land on 4.5m and 2.5m, which gives COMFORTABLE on
       * one and JUST_ENOUGH or INSUFFICIENT on the other depending on height.
       */
      metreage: garmentType === 'unstitched' ? 2.0 + (index % 6) * 0.5 : null,
      isNew: index % 5 === 0,
      launchedAt: new Date(LAUNCH_EPOCH - index * DAY_MS).toISOString(),
      // Roughly one in seven is out of stock, so empty states are reachable.
      isInStock: index % 7 !== 3,
      photo,
      garment: photo.garment,
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
  images: string[];
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
    /*
     * Stands in for a backend-authored, per-locale product name. Assembling it
     * here is fixture generation, not interface copy (I18N-06 governs the latter).
     *
     * Work type plus garment, NOT fabric plus garment: the card already prints
     * fabric and colour on its own line, and a name that repeated the fabric
     * read as "Wash-n-wear Kameez Shalwar / Wash-n-wear · Charcoal".
     */
    name: `${vocabularyLabel(locale, record.workType)} ${vocabularyLabel(locale, record.garment)}`,
    type: record.type,
    pieceCount: record.pieceCount,
    images: frameUrls(record.photo),
    workType: vocabularyLabel(locale, record.workType),
    fabricName: vocabularyLabel(locale, record.fabric),
    colourName: vocabularyLabel(locale, record.colour),
    pricing: { currentMinor: record.currentMinor, originalMinor: record.originalMinor },
    metreage: record.metreage,
    isNew: record.isNew,
  };
}
