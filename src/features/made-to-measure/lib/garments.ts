/**
 * §34.6 — the measurement set, as garment flats.
 *
 * The customer measures a GARMENT they already own, laid flat, rather than their
 * own body. That is the path §34.8 already made Release 1 scope, and it is the
 * easier one: a garment on a table does not breathe, slouch or need a second
 * person, and it copies a fit its owner has already confirmed.
 *
 * ## The shape of an annotation IS its arithmetic
 *
 * A RING is drawn as an ellipse and means *this goes around*: it is measured
 * ACROSS the flat garment and DOUBLED to a circumference. A SPAN is drawn as an
 * arrow and is taken exactly as the tape reads it.
 *
 * That distinction is the one §34.6 calls load-bearing, carried over from the
 * three-dimensional figure unchanged — only now it is drawn rather than modelled.
 * Storing the doubled figure is what keeps the record meaningful: a tailor's card
 * holds a chest of forty inches, not a twenty-inch half.
 *
 * The drawings these annotations land on live in `garment-drawings.ts`.
 *
 * Pure: no React, no DOM (PD-02). Coordinates are each garment's own drawing
 * space.
 */

export const GARMENTS = ['KAMEEZ', 'SHALWAR', 'WAISTCOAT'] as const;
export type GarmentId = (typeof GARMENTS)[number];

/**
 * The ids as a literal union rather than `string`, so `messages.points[id]`
 * resolves. A measurement added here without copy beside it is then a COMPILE
 * error rather than a blank label on the drawing.
 */
export const MEASUREMENT_IDS = [
  'kameezShoulder',
  'kameezChest',
  'kameezLength',
  'kameezSleeve',
  'kameezCuff',
  'kameezBottom',
  'shalwarWaist',
  'shalwarLength',
  'shalwarThigh',
  'shalwarPaincha',
  'waistcoatShoulder',
  'waistcoatChest',
  'waistcoatLength',
] as const;

export type MeasurementId = (typeof MEASUREMENT_IDS)[number];

/**
 * A ring wraps and is doubled; a span is read straight off the tape.
 *
 * `rotate` exists because a cuff is not horizontal. An axis-aligned ellipse laid
 * over a sleeve that hangs at thirty degrees crosses the cuff seam instead of
 * following it, which points the tape at the wrong line.
 */
export type Annotation =
  | {
      readonly shape: 'RING';
      readonly cx: number;
      readonly cy: number;
      readonly rx: number;
      readonly ry: number;
      readonly rotate?: number;
    }
  | {
      readonly shape: 'SPAN';
      readonly x1: number;
      readonly y1: number;
      readonly x2: number;
      readonly y2: number;
    };

export interface Measurement {
  readonly id: MeasurementId;
  readonly garment: GarmentId;
  /** Bounds on the STORED figure — the circumference for a ring. */
  readonly minMm: number;
  readonly maxMm: number;
  readonly annotation: Annotation;
}

/** A ring's entered figure is half of what gets recorded. */
export function storedFromEntered(measurement: Measurement, entered: number): number {
  return measurement.annotation.shape === 'RING' ? entered * 2 : entered;
}

export function enteredFromStored(measurement: Measurement, stored: number): number {
  return measurement.annotation.shape === 'RING' ? stored / 2 : stored;
}

/**
 * §34 makes the real set CONTENT rather than code (ADR 17) — it comes from the
 * tailor's card, through the backend, in the shape below. This fixture stands in
 * until it does. The bounds are plausible, not authoritative, and they are
 * GARMENT figures: a kameez chest carries ease that a body chest does not.
 */
export const MEASUREMENTS: readonly Measurement[] = [
  {
    id: 'kameezShoulder',
    garment: 'KAMEEZ',
    minMm: 350,
    maxMm: 600,
    // Seam to seam across the back, and NOT doubled — the whole span is on the
    // table already, unlike a chest, which is folded in half by the garment.
    annotation: { shape: 'SPAN', x1: 62, y1: 44, x2: 138, y2: 44 },
  },
  {
    id: 'kameezChest',
    garment: 'KAMEEZ',
    minMm: 800,
    maxMm: 1500,
    // An inch below the underarm, which the outline puts at y=76.
    annotation: { shape: 'RING', cx: 100, cy: 90, rx: 37, ry: 9 },
  },
  {
    id: 'kameezLength',
    garment: 'KAMEEZ',
    minMm: 900,
    maxMm: 1300,
    // Down the front on the far side of the placket from the chest ring, so the
    // two markers do not overlap into one 36px hit area on a phone.
    annotation: { shape: 'SPAN', x1: 122, y1: 31, x2: 122, y2: 242 },
  },
  {
    id: 'kameezSleeve',
    garment: 'KAMEEZ',
    minMm: 450,
    maxMm: 750,
    // Outside the sleeve and PARALLEL to it, the way a pattern sheet marks a
    // length that runs along an edge.
    annotation: { shape: 'SPAN', x1: 147, y1: 34, x2: 179, y2: 145 },
  },
  {
    id: 'kameezCuff',
    garment: 'KAMEEZ',
    minMm: 200,
    maxMm: 380,
    annotation: { shape: 'RING', cx: 161, cy: 153, rx: 11, ry: 4, rotate: -30 },
  },
  {
    id: 'kameezBottom',
    garment: 'KAMEEZ',
    minMm: 900,
    maxMm: 1800,
    annotation: { shape: 'RING', cx: 100, cy: 239, rx: 47, ry: 10 },
  },
  {
    id: 'shalwarWaist',
    garment: 'SHALWAR',
    minMm: 650,
    maxMm: 1800,
    // On the belt itself, which is where a shalwar is measured — below it the
    // cloth is gathered and reads whatever it is pulled to.
    annotation: { shape: 'RING', cx: 100, cy: 29, rx: 82, ry: 9 },
  },
  {
    id: 'shalwarLength',
    garment: 'SHALWAR',
    minMm: 900,
    maxMm: 1200,
    annotation: { shape: 'SPAN', x1: 12, y1: 20, x2: 12, y2: 246 },
  },
  {
    id: 'shalwarThigh',
    garment: 'SHALWAR',
    minMm: 500,
    maxMm: 900,
    annotation: { shape: 'RING', cx: 52, cy: 125, rx: 33, ry: 9 },
  },
  {
    id: 'shalwarPaincha',
    garment: 'SHALWAR',
    minMm: 200,
    maxMm: 450,
    annotation: { shape: 'RING', cx: 36, cy: 240, rx: 17, ry: 6 },
  },
  {
    id: 'waistcoatShoulder',
    garment: 'WAISTCOAT',
    minMm: 350,
    maxMm: 600,
    annotation: { shape: 'SPAN', x1: 58, y1: 32, x2: 142, y2: 32 },
  },
  {
    id: 'waistcoatChest',
    garment: 'WAISTCOAT',
    minMm: 800,
    maxMm: 1400,
    annotation: { shape: 'RING', cx: 100, cy: 94, rx: 53, ry: 10 },
  },
  {
    id: 'waistcoatLength',
    garment: 'WAISTCOAT',
    minMm: 550,
    maxMm: 850,
    annotation: { shape: 'SPAN', x1: 74, y1: 27, x2: 74, y2: 166 },
  },
];

export function measurementsFor(garment: GarmentId): readonly Measurement[] {
  return MEASUREMENTS.filter((measurement) => measurement.garment === garment);
}

/**
 * Where a marker sits.
 *
 * A ring is marked ON the ring, at its outer extremity, not at the centre of the
 * garment — that is where the tape is laid, and a dot in the middle of a chest
 * lands among the placket buttons and is taken for one.
 *
 * A span is marked a third of the way along for the same reason: the midpoint of
 * a shoulder measurement is the centre front, which is the single busiest line on
 * every one of these drawings.
 */
const SPAN_ANCHOR_FRACTION = 0.3;

export function anchorOf(measurement: Measurement): { readonly x: number; readonly y: number } {
  const { annotation } = measurement;

  if (annotation.shape === 'RING') {
    const radians = ((annotation.rotate ?? 0) * Math.PI) / 180;
    return {
      x: annotation.cx - annotation.rx * Math.cos(radians),
      y: annotation.cy - annotation.rx * Math.sin(radians),
    };
  }

  return {
    x: annotation.x1 + (annotation.x2 - annotation.x1) * SPAN_ANCHOR_FRACTION,
    y: annotation.y1 + (annotation.y2 - annotation.y1) * SPAN_ANCHOR_FRACTION,
  };
}
