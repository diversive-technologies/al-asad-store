/**
 * The body's measurements, band by band.
 *
 * Half-width and half-depth at a series of heights. Everything the mannequin is
 * built from comes from this table, and so does every tape path — which is what
 * stops the geometry and the measurements ever disagreeing about how thick the
 * body is where a tape sits.
 *
 * ## Proportions are canon, not taste
 *
 * The eight landmarks below marked CANON come from the `img2threejs` skill's
 * figure-drawing corpus (`humanoid_proportions.py`), as fractions of total
 * height H = 420:
 *
 *   shoulder width 0.25 · waist width 0.125 · hip width 0.1875
 *   hip line 0.50 · knee line 0.25 · upper arm 0.187 · forearm 0.187 · shin 0.25
 *
 * That corpus deliberately does NOT supply hand length, foot length, thigh
 * length, chest width or the shoulder and waist heights — it names them
 * `unsourced` rather than inventing them. Those are marked CONVENTION here and
 * follow ordinary figure-drawing practice, so the two kinds of number stay
 * distinguishable.
 *
 * **The figure used to be 11.3 heads tall.** A person is 7.5 to 8. Nothing else
 * made it read as a dummy so strongly: every individual part was plausible and
 * the assembly was not a human being. It is 8 heads now.
 *
 * Pure: no React, no DOM, no three (PD-02). Torso, leg and foot coordinates are
 * the figure's own space, `200 x 420` with Y downward. The ARM and HAND are
 * different, and deliberately so — see below.
 */

export const BODY_PARTS = ['TORSO', 'ARM', 'HAND', 'LEG', 'FOOT'] as const;
export type BodyPart = (typeof BODY_PARTS)[number];

/** Total figure height, and the unit every canon fraction is taken against. */
export const FIGURE_HEIGHT = 420;

/** CANON: eight heads to the figure. The head is therefore 52.5 units tall. */
export const STYLE_HEADS = 8;

/** `[at, halfWidth, halfDepth, centreOffset]`. */
type Band = readonly [number, number, number, number];

/**
 * Crown to crotch, on the centre line.
 *
 * The depth column is what makes the figure read as a body rather than a
 * cardboard cut-out: a chest is deeper than it is wide at the sides, a waist
 * is not.
 *
 * The torso stops at the shoulder LINE rather than the shoulder point — the
 * deltoid belongs to the arm, so it can move. Canon's 0.25H shoulder width is
 * met by the two together: torso 38 plus a 15-unit deltoid reaches 53, against
 * the canon's 52.5.
 */
const TORSO: readonly Band[] = [
  /* The first and last bands of every part taper to almost nothing. A loft is
     capped with a flat disc, and at any real radius that disc catches the key
     light and reads as a cut end — a sliced skull, a sawn-off wrist. */
  [6, 3, 3.5, 0],
  [12, 12, 13, 0],
  [20, 20, 22, 0],
  [30, 24, 26, 0],
  [42, 22, 24, 0],
  [52, 16, 18, 0],
  [58, 13, 14, 0],
  [66, 14, 15, 0],
  [72, 23, 17, 0],
  [78, 38, 20, 0],
  [90, 40, 23, 0],
  [104, 41, 25, 0],
  [120, 38, 24, 0],
  [140, 33, 22, 0],
  [162, 29, 21, 0],
  [178, 32, 22, 0],
  [196, 38, 24, 0],
  [210, 37, 23, 0],
];

/**
 * One arm, measured ALONG ITS OWN LENGTH from the shoulder joint rather than by
 * height on the figure.
 *
 * That is the whole reason the arm can be posed. Baked into figure heights, an
 * arm is stuck in whatever attitude it was authored in; expressed as a limb with
 * a pivot, the same geometry hangs, lifts clear of the ribs for a chest reading,
 * or goes out to a T for a sleeve — and the tape, the marker and the HAND on it
 * travel with it, because they are expressed in the same space.
 *
 * CANON: upper arm 0.187H and forearm 0.187H put the wrist at 157.
 */
const ARM: readonly Band[] = [
  /* Starts ABOVE the joint so its cap is swallowed by the shoulder socket. */
  [-12, 9, 10, 0],
  [0, 15, 16, 0],
  [16, 13, 14, 0],
  [40, 11.5, 12.5, 0],
  [78, 10, 10.5, 0],
  [110, 9, 9, 0],
  [140, 7.5, 7.5, 0],
  [157, 6.5, 6.5, 0],
];

/** CANON: the wrist, where the arm ends and the hand is hung. */
export const WRIST_ALONG = 157;

/**
 * The palm, continuing down the arm's own axis from the wrist.
 *
 * CONVENTION, not canon: the corpus names `handLength` as unsourced. Figure
 * drawing puts a hand at about three quarters of a head, so 39 units.
 */
const HAND: readonly Band[] = [
  [157, 6.5, 6.5, 0],
  [163, 9, 5.5, 0],
  [172, 10, 5, 0],
  [182, 9.5, 4.5, 0],
  [188, 8, 4, 0],
];

/** Where the palm ends and the fingers start. */
export const KNUCKLE_ALONG = 188;

/**
 * CONVENTION: four fingers plus a thumb, as `[lateralOffset, length, radius]`.
 *
 * Set close enough that they touch. Spaced to the full palm width with a thinner
 * radius they rendered as four separate spikes — a rake, not a hand. A relaxed
 * hand holds its fingers together and slightly curled, which is what the
 * direction in `buildArmGeometry` supplies.
 */
export const FINGERS: readonly (readonly [number, number, number])[] = [
  [-5.1, 25, 3.1],
  [-1.75, 28, 3.2],
  [1.75, 26.5, 3.1],
  [5, 21, 2.8],
];

/** The thumb leaves the palm early and to the side, which is what reads as a hand. */
export const THUMB = { along: 168, lateral: 9, length: 22, radius: 2.9 } as const;

/**
 * One leg, from the crotch line down.
 *
 * CANON: the hip line sits at 0.50H — legs are half a person — and the knee at
 * 0.25H from the ground, which is 315 here.
 */
const LEG: readonly Band[] = [
  [212, 17, 21, 19],
  [240, 16, 20, 19],
  [270, 14, 18, 19],
  [315, 11, 13, 19],
  [350, 10, 13, 19],
  [380, 8, 11, 19],
  [402, 6.5, 8, 19],
];

/** CANON-adjacent: the ankle, where the leg ends and the foot is hung. */
export const ANKLE_Y = 402;

/**
 * The foot, as a profile along its own length forward from the ankle.
 *
 * CONVENTION: the corpus names `footLength` unsourced. A foot is about one head
 * long, so 52 units, and it runs forward rather than down — which is why it has
 * its own space rather than being more leg.
 */
const FOOT: readonly Band[] = [
  [0, 6.5, 8, 0],
  [8, 7.5, 9, 0],
  [20, 8, 7.5, 0],
  [34, 8.5, 5.5, 0],
  [46, 7.5, 3.5, 0],
  [52, 5, 2, 0],
];

/** How far the foot's heel sits behind the ankle, and how far its sole is below. */
export const FOOT_ANCHOR = { back: 14, drop: 9 } as const;

const BANDS: Readonly<Record<BodyPart, readonly Band[]>> = { TORSO, ARM, HAND, LEG, FOOT };

export const PART_RANGE: Readonly<Record<BodyPart, readonly [number, number]>> = {
  TORSO: [6, 210],
  ARM: [-12, 157],
  HAND: [157, 188],
  LEG: [212, 402],
  FOOT: [0, 52],
};

/** Where the arm swings from, in figure space. On the shoulder line. */
export const SHOULDER_JOINT = { y: 78, x: 38 } as const;

/** How far an arm hangs from vertical when nothing asks otherwise, in degrees. */
export const ARM_REST_ANGLE = 11;

export interface CrossSection {
  /** Centre of the section across the body. Always 0 in a limb's own space. */
  readonly cx: number;
  readonly at: number;
  readonly halfWidth: number;
  readonly halfDepth: number;
}

/** Parts whose bands are a limb's own axis rather than a height on the figure. */
const LIMB_LOCAL: ReadonlySet<BodyPart> = new Set<BodyPart>(['ARM', 'HAND', 'FOOT']);

/**
 * The body's shape at one height — or, for a limb, at one distance along it.
 *
 * `side` is -1 for the limb on one side and 1 for the other. It is ignored by
 * the torso, which straddles the centre line, and by every limb-local part,
 * which is built once in its own space and placed by its group.
 */
export function crossSectionAt(part: BodyPart, at: number, side: -1 | 1 = -1): CrossSection {
  const bands = BANDS[part];
  const first = bands[0];
  const last = bands[bands.length - 1];
  // TS-01 (noUncheckedIndexedAccess): the tables above are never empty, but the
  // type system cannot know that, so the guard is real code rather than a cast.
  if (first === undefined || last === undefined) {
    return { cx: 0, at, halfWidth: 0, halfDepth: 0 };
  }

  const clamped = Math.min(Math.max(at, first[0]), last[0]);

  let lower = first;
  let upper = last;
  for (let index = 0; index < bands.length - 1; index += 1) {
    const a = bands[index];
    const b = bands[index + 1];
    if (a === undefined || b === undefined) continue;
    if (clamped >= a[0] && clamped <= b[0]) {
      lower = a;
      upper = b;
      break;
    }
  }

  const span = upper[0] - lower[0];
  const t = span === 0 ? 0 : (clamped - lower[0]) / span;
  const lerp = (a: number, b: number): number => a + (b - a) * t;

  return {
    cx: LIMB_LOCAL.has(part) ? 0 : 100 + side * lerp(lower[3], upper[3]),
    at: clamped,
    halfWidth: lerp(lower[1], upper[1]),
    halfDepth: lerp(lower[2], upper[2]),
  };
}
