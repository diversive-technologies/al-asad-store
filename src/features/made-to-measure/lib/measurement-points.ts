import { ARM_REST_ANGLE } from './body-profile';

/**
 * §34.6 — the measurement set.
 *
 * ONE list feeds the mannequin and the form (PD-01), so a point cannot be marked
 * on the body and missing from the fields, or the reverse. Adding a measurement
 * is a row here; no component changes.
 *
 * §34 makes the real set CONTENT rather than code (ADR 17) — it comes from the
 * tailor's card, through the backend, in the shape below. This fixture stands in
 * until it does, exactly as `catalogue-db` stands in for the product service
 * under D1. The IDs, bounds and geometry are plausible, not authoritative.
 */

export const MEASUREMENT_REGIONS = ['NECK', 'TORSO', 'ARM', 'LEG'] as const;
export type MeasurementRegion = (typeof MEASUREMENT_REGIONS)[number];

/**
 * The distinction §34.6 calls load-bearing.
 *
 * A GIRTH wraps the body and is drawn as a ring on its real cross-section. A
 * LENGTH runs along the surface and a WIDTH across it. Mistaking a girth for a
 * width is the commonest measuring error there is, and on a flat drawing the two
 * are identical — so the model shows the difference rather than asserting it.
 */
export type MeasurementKind = 'GIRTH' | 'LENGTH' | 'WIDTH';

/**
 * The ids as a literal union rather than `string`, so `messages.points[id]`
 * resolves. A point added here without copy beside it is then a COMPILE error
 * rather than a blank label on the model — the I18N-10 guarantee, enforced by
 * the type system instead of by remembering.
 */
export const MEASUREMENT_POINT_IDS = [
  'neck',
  'shoulder',
  'chest',
  'waist',
  'hip',
  'kameezLength',
  'sleeveLength',
  'armhole',
  'sleeveOpening',
  'shalwarWaist',
  'shalwarLength',
  'thigh',
  'paincha',
] as const;

export type MeasurementPointId = (typeof MEASUREMENT_POINT_IDS)[number];

interface MeasurementPointBase {
  readonly id: MeasurementPointId;
  readonly region: MeasurementRegion;
  /** Plausibility bounds in millimetres. §34.7 — server-owned in the real module. */
  readonly minMm: number;
  readonly maxMm: number;
  /**
   * Where the model turns to show this measurement, in degrees about the
   * vertical axis.
   *
   * A property of the measurement rather than of the viewer: a girth reads as
   * wrapping only from three-quarters, a length reads best from the side, and
   * the shoulder is taken across the BACK, so the figure turns around for it —
   * the fact most customers get wrong.
   */
  readonly spin: number;
  /**
   * How far the arms lift from vertical for this measurement, in degrees.
   *
   * A real tailor asks you to raise your arms before taking a chest, because the
   * tape has to pass under them; a sleeve is taken with the arm out. The model
   * does the same thing, which shows the customer what to do with their own body
   * without a line of copy asking.
   */
  readonly armLift: number;
}

/**
 * Coordinates live in one of two spaces, and `space` says which.
 *
 * BODY is the figure's own `200 x 420`, Y downward — shared with the torso and
 * leg geometry. ARM is the limb's own space, measured from the shoulder joint
 * along its length, so anything expressed in it is carried by the arm when the
 * arm moves. §34.6: neither mirrors under right-to-left; a body is not a layout.
 */
export type MeasurementPoint = MeasurementPointBase &
  (
    | {
        readonly kind: 'GIRTH';
        readonly space: 'BODY';
        readonly part: 'TORSO' | 'LEG';
        readonly at: number;
        readonly side: -1 | 1;
      }
    | { readonly kind: 'GIRTH'; readonly space: 'ARM'; readonly along: number }
    | {
        readonly kind: 'LENGTH';
        readonly space: 'ARM';
        readonly along1: number;
        readonly along2: number;
      }
    | {
        readonly kind: 'LENGTH' | 'WIDTH';
        readonly space: 'BODY';
        readonly x1: number;
        readonly y1: number;
        readonly x2: number;
        readonly y2: number;
        /** Depth of the surface the tape lies on. Negative is behind the body. */
        readonly z: number;
      }
  );

export const MEASUREMENT_POINTS: readonly MeasurementPoint[] = [
  {
    id: 'neck',
    region: 'NECK',
    kind: 'GIRTH',
    space: 'BODY',
    part: 'TORSO',
    at: 66,
    side: -1,
    minMm: 300,
    maxMm: 520,
    spin: -28,
    armLift: ARM_REST_ANGLE,
  },
  {
    id: 'shoulder',
    region: 'NECK',
    kind: 'WIDTH',
    space: 'BODY',
    x1: 47,
    y1: 78,
    x2: 153,
    y2: 78,
    /*
     * Behind the body, because shoulder width is taken across the BACK. The
     * figure turns around to show it rather than the tape being drawn on the
     * chest, where it would teach the wrong thing. The span is the canon 0.25H
     * shoulder width — acromion to acromion, deltoids included.
     */
    z: -20,
    minMm: 350,
    maxMm: 600,
    spin: 180,
    armLift: 20,
  },
  {
    id: 'chest',
    region: 'TORSO',
    kind: 'GIRTH',
    space: 'BODY',
    part: 'TORSO',
    at: 104,
    side: -1,
    minMm: 750,
    maxMm: 1400,
    spin: -28,
    // Arms up, the way a tailor asks — the tape has to pass under them.
    armLift: 68,
  },
  {
    id: 'waist',
    region: 'TORSO',
    kind: 'GIRTH',
    space: 'BODY',
    part: 'TORSO',
    at: 162,
    side: -1,
    minMm: 600,
    maxMm: 1400,
    spin: -28,
    armLift: 34,
  },
  {
    id: 'hip',
    region: 'TORSO',
    kind: 'GIRTH',
    space: 'BODY',
    part: 'TORSO',
    at: 196,
    side: -1,
    minMm: 750,
    maxMm: 1500,
    spin: -28,
    armLift: 34,
  },
  {
    id: 'kameezLength',
    region: 'TORSO',
    kind: 'LENGTH',
    space: 'BODY',
    x1: 100,
    y1: 76,
    x2: 100,
    y2: 250,
    z: 26,
    minMm: 900,
    maxMm: 1300,
    spin: -10,
    armLift: 42,
  },
  {
    id: 'sleeveLength',
    region: 'ARM',
    kind: 'LENGTH',
    space: 'ARM',
    // Shoulder tip to wrist — the canon 0.187H upper arm plus 0.187H forearm.
    along1: 2,
    along2: 155,
    minMm: 450,
    maxMm: 750,
    spin: -54,
    // Straight out, so the whole run of the sleeve is in view at once.
    armLift: 88,
  },
  {
    id: 'armhole',
    region: 'ARM',
    kind: 'GIRTH',
    space: 'ARM',
    along: 8,
    minMm: 350,
    maxMm: 650,
    spin: -46,
    armLift: 62,
  },
  {
    id: 'sleeveOpening',
    region: 'ARM',
    kind: 'GIRTH',
    space: 'ARM',
    // At the wrist, just above the hand — which is now a real landmark to aim at.
    along: 152,
    minMm: 200,
    maxMm: 350,
    spin: -54,
    armLift: 88,
  },
  {
    id: 'shalwarWaist',
    region: 'LEG',
    kind: 'GIRTH',
    space: 'BODY',
    part: 'TORSO',
    at: 186,
    side: -1,
    minMm: 600,
    maxMm: 1400,
    spin: -28,
    armLift: 26,
  },
  {
    id: 'shalwarLength',
    region: 'LEG',
    kind: 'LENGTH',
    space: 'BODY',
    x1: 82,
    y1: 186,
    x2: 82,
    y2: 400,
    z: 17,
    minMm: 900,
    maxMm: 1200,
    spin: -62,
    armLift: 26,
  },
  {
    id: 'thigh',
    region: 'LEG',
    kind: 'GIRTH',
    space: 'BODY',
    part: 'LEG',
    at: 240,
    side: -1,
    minMm: 450,
    maxMm: 850,
    spin: -34,
    armLift: ARM_REST_ANGLE,
  },
  {
    id: 'paincha',
    region: 'LEG',
    kind: 'GIRTH',
    space: 'BODY',
    part: 'LEG',
    // At the ankle, where the foot now gives it something to sit against.
    at: 398,
    side: -1,
    minMm: 200,
    maxMm: 450,
    spin: -34,
    armLift: ARM_REST_ANGLE,
  },
];

export function pointsInRegion(region: MeasurementRegion): readonly MeasurementPoint[] {
  return MEASUREMENT_POINTS.filter((point) => point.region === region);
}
