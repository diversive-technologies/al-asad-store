/**
 * §34.6 — the garment flats themselves.
 *
 * PICTURE DATA, and the frontend's own: under D5's product-not-client exception
 * these drawings are the product's domain, while the measurement list drawn on
 * them is served content. A served list names a drawing by id, and its shapes are
 * in that drawing's viewBox; an id not listed here is a contract violation.
 *
 * ## The drawings are patterns, not pictures
 *
 * Every silhouette is authored the way a pattern sheet is: the shoulder seam,
 * the armhole, the side seam and the hem are each a segment a tailor would
 * recognise, and every shape in the measurement list lands on the seam it is
 * taken from. A drawing that merely suggests a kameez sends the tape to the wrong
 * place, which is worse than no drawing — the customer trusts it.
 *
 * Pure: no React, no DOM (PD-02). Coordinates are each garment’s own drawing
 * space. §34.6: a garment flat does not mirror under right-to-left — a placket is
 * on the side it is sewn on — so these stay as authored.
 */

import { kameezVaried } from './kameez-variants';

export const DRAWING_IDS = ['KAMEEZ', 'SHALWAR', 'WAISTCOAT'] as const;
export type DrawingId = (typeof DRAWING_IDS)[number];

/** A ring in the drawing's own coordinates. */
export interface EmblemRing {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

export interface GarmentDrawing {
  readonly id: DrawingId;
  readonly width: number;
  readonly height: number;
  /** The silhouette, stroked. */
  readonly outline: readonly string[];
  /** Collars, plackets, cuffs, seams — everything that makes it read as a garment. */
  readonly detail: readonly string[];
  /**
   * The one ring this garment wears off the studio, on the homepage. Declared
   * here as part of the picture rather than borrowed from a measurement: the
   * measurement list is served content, and a homepage emblem should neither make
   * a backend read nor move because a tailor reordered a form.
   */
  readonly emblem: EmblemRing;
  /**
   * The parts that follow the customer's finishing choices (§34.5 `options[]`):
   * given the drawing variants the choices name, the strokes to add. With none
   * named it draws the garment's default — see `detailOf`.
   */
  readonly varied?: (variants: ReadonlySet<string>) => readonly string[];
}

const NO_VARIANTS: ReadonlySet<string> = new Set();

/** Every detail stroke of a drawing, as the given variants leave it. */
export function detailOf(
  drawing: GarmentDrawing,
  variants: ReadonlySet<string> = NO_VARIANTS,
): readonly string[] {
  return drawing.varied === undefined ? drawing.detail : [...drawing.detail, ...drawing.varied(variants)];
}

/**
 * The kameez.
 *
 * Read anticlockwise from the centre of the neckline: neck scoop, shoulder seam,
 * the outer sleeve down to the cuff, the cuff itself, the under-sleeve back up to
 * the underarm, then the side seam falling away to an A-line hem that dips at the
 * centre front. The right half is the mirror of the left, so the shoulder and hem
 * annotations sit symmetrically on it by construction.
 */
const KAMEEZ: GarmentDrawing = {
  id: 'KAMEEZ',
  width: 200,
  height: 260,
  outline: [
    'M100,32 C96,32 88,31 84,29 ' +
      'L62,36 L30,148 L47,158 L66,76 L56,238 ' +
      'C56,242 76,245 100,245 C124,245 144,242 144,238 ' +
      'L134,76 L153,158 L170,148 L138,36 L116,29 ' +
      'C112,31 104,32 100,32 Z',
  ],
  detail: [
    // Placket, closed, with its buttons.
    'M94,31 L94,96 L106,96 L106,31',
    'M100,44 m-1.6,0 a1.6,1.6 0 1,0 3.2,0 a1.6,1.6 0 1,0 -3.2,0',
    'M100,57 m-1.6,0 a1.6,1.6 0 1,0 3.2,0 a1.6,1.6 0 1,0 -3.2,0',
    'M100,70 m-1.6,0 a1.6,1.6 0 1,0 3.2,0 a1.6,1.6 0 1,0 -3.2,0',
    'M100,83 m-1.6,0 a1.6,1.6 0 1,0 3.2,0 a1.6,1.6 0 1,0 -3.2,0',
    // Side slits, drawn just inside the side seam.
    'M63,194 L60,232',
    'M137,194 L140,232',
  ],
  // The neck and the sleeve ends follow the customer's choices.
  varied: kameezVaried,
  // Round the chest, an inch below the underarm.
  emblem: { cx: 100, cy: 90, rx: 37, ry: 9 },
};

/**
 * The shalwar.
 *
 * A shalwar is WIDE, and the drawing has to say so — a schematic pared back to
 * straight lines read as a trouser, however correct its outline was. The
 * fullness is carried by four things and all four earn their place: a wide belt
 * with the cloth GATHERED onto it, the nala hanging out of the centre front, the
 * drape falling on down the leg, and inseams that CURVE, because the garment
 * holds far more cloth than the leg needs.
 *
 * THE ONE NUMBER THAT DECIDES WHETHER IT READS AS CLOTHING IS WHERE THE CROTCH
 * SITS. It was wrong at 57%, and wrong again at 44%, through three rounds spent
 * redrawing the silhouette, the seams and then the whole level of detail. Below
 * the crotch there has to be MORE than above it: the draft puts it one third of
 * the hip below the waist — about 13 in on a 40 in shalwar — which is 74 units
 * here against 152 of leg, near enough the 1:2 a person actually is. At 44% the
 * legs come out shorter than the block above them, which no human is, and it
 * reads as clown trousers whatever else the drawing does right.
 *
 * Drafted from a 40 in side length, 38 in hip, 14 in paincha: 156 units of flat
 * waist to 28 of flat paincha, which is where the taper comes from.
 */
const SHALWAR: GarmentDrawing = {
  id: 'SHALWAR',
  width: 200,
  height: 260,
  outline: [
    /* The outer sides are PERFECTLY VERTICAL — one line, no taper, no kink at the
       hip. All the shaping is on the inside: the legs splay well apart, and that
       angle is what leaves the cloth between them. The paincha stays 28 units
       whatever the splay does, because it is a measurement and not a consequence
       of the drawing — widening the ankle to suit a wider stance would be the
       picture telling a lie about a number the customer types in. */
    'M22,20 L178,20 L178,246 L150,246 ' +
      'C146,200 130,140 103,94 C101,92 99,92 97,94 ' +
      'C70,140 54,200 50,246 L22,246 L22,20 Z',
  ],
  detail: [
    // The belt, and the nala hanging out of the centre front.
    'M24,38 L176,38',
    'M97,38 C95,50 93,58 92,68',
    'M103,38 C105,50 107,58 108,68',
    // The gathers falling out of the band. Without them the belt reads as a
    // stiff trouser waistband, which a nala shalwar's is not: its nefa gathers on
    // the cord, and is measured loosened and spread flat.
    'M36,38 C35,48 34,58 33,68',
    'M50,38 C49,48 48,58 47,70',
    'M64,38 C63,48 62,58 61,70',
    'M78,38 C77,48 76,60 75,72',
    'M164,38 C165,48 166,58 167,68',
    'M150,38 C151,48 152,58 153,70',
    'M136,38 C137,48 138,58 139,70',
    'M122,38 C123,48 124,60 125,72',
    /* The fullness falling on down the leg. It starts BELOW the gathers rather
       than beside them: run together from the band, twelve strokes at four
       different lengths read as a picket fence instead of as cloth. */
    'M40,80 C36,130 32,190 30,236',
    'M64,80 C58,130 46,180 42,236',
    'M160,80 C164,130 168,190 170,236',
    'M136,80 C142,130 154,180 158,236',
    // Paincha hems, deep enough to read as the band they are.
    'M23,232 L51,232',
    'M149,232 L177,232',
  ],
  // Round the waistband.
  emblem: { cx: 100, cy: 29, rx: 82, ry: 9 },
};

/**
 * The waistcoat.
 *
 * The armholes are CUT IN — a curve bowing toward the centre, not a bulge — and
 * that single detail is what stops the drawing reading as a sleeveless tunic.
 * The V of the neck is part of the silhouette; the closure below it is a detail
 * line, because the two fronts overlap there rather than ending.
 */
const WAISTCOAT: GarmentDrawing = {
  id: 'WAISTCOAT',
  width: 200,
  height: 200,
  outline: [
    'M86,24 L58,30 ' +
      'C72,46 72,70 48,86 C54,105 50,135 54,156 L76,168 L100,174 ' +
      'L124,168 L146,156 C150,135 146,105 152,86 ' +
      'C128,70 128,46 142,30 L114,24 L100,76 L86,24 Z',
  ],
  detail: [
    // The closure, below the V where the two fronts overlap.
    'M100,76 L100,174',
    // Front facing, echoing the neckline.
    'M89,26 L100,82',
    'M111,26 L100,82',
    // Buttons.
    'M100,96 m-1.6,0 a1.6,1.6 0 1,0 3.2,0 a1.6,1.6 0 1,0 -3.2,0',
    'M100,112 m-1.6,0 a1.6,1.6 0 1,0 3.2,0 a1.6,1.6 0 1,0 -3.2,0',
    'M100,128 m-1.6,0 a1.6,1.6 0 1,0 3.2,0 a1.6,1.6 0 1,0 -3.2,0',
    'M100,144 m-1.6,0 a1.6,1.6 0 1,0 3.2,0 a1.6,1.6 0 1,0 -3.2,0',
    // Welt pockets.
    'M64,136 L82,134',
    'M118,134 L136,136',
  ],
  // Round the chest, just below the armholes.
  emblem: { cx: 100, cy: 94, rx: 53, ry: 10 },
};

export const DRAWINGS: Readonly<Record<DrawingId, GarmentDrawing>> = {
  KAMEEZ,
  SHALWAR,
  WAISTCOAT,
};
