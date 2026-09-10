import * as THREE from 'three';

import {
  ANKLE_Y,
  crossSectionAt,
  FINGERS,
  FOOT_ANCHOR,
  KNUCKLE_ALONG,
  PART_RANGE,
  SHOULDER_JOINT,
  THUMB,
  type BodyPart,
} from './body-profile';
import type { MeasurementPoint } from './measurement-points';

/**
 * The mannequin, as real geometry.
 *
 * Each part is a surface lofted through the body's cross-sections: sample the
 * profile finely, smooth it, ring each sample with a superellipse, stitch the
 * rings into quads. That gives a continuous mesh a physical material can catch
 * light on.
 *
 * The arm — and the hand on the end of it — is built in ITS OWN space, hanging
 * from the origin, so the scene can pivot it at the shoulder. Anything that
 * belongs to the arm travels with it for free.
 */

/** Figure units per world unit. A body comes out a little over 4 units tall. */
const UNITS = 100;

/** Y in figure space that maps to the world origin — the ground. */
const GROUND_Y = 420;

/** Vertices around each ring on the body. */
const RADIAL = 96;

/** Fingers are small and numerous; they do not need the body's ring count. */
const DIGIT_RADIAL = 12;

/** How square the cross-section is. 1 is a pure ellipse; below it, flatter sides. */
const SQUARENESS = 0.82;

export function toWorld(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3((x - 100) / UNITS, (GROUND_Y - y) / UNITS, z / UNITS);
}

/** The shoulder pivot in world space, for the arm group to sit on. */
export function shoulderWorld(side: -1 | 1): THREE.Vector3 {
  return toWorld(100 + side * SHOULDER_JOINT.x, SHOULDER_JOINT.y, 0);
}

/** The ankle in world space, for the foot group to sit on. */
export function ankleWorld(side: -1 | 1): THREE.Vector3 {
  const leg = crossSectionAt('LEG', ANKLE_Y, side);
  return toWorld(leg.cx, ANKLE_Y, 0);
}

/** A point in a limb's own space: down the limb from the joint at the origin. */
export function limbLocal(along: number, lateral: number, depth: number): THREE.Vector3 {
  return new THREE.Vector3(lateral / UNITS, -along / UNITS, depth / UNITS);
}

/** A point on a cross-section's rim, at an angle around it. */
function rim(cx: number, halfWidth: number, halfDepth: number, angle: number): THREE.Vector2 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new THREE.Vector2(
    cx + halfWidth * Math.sign(c) * Math.abs(c) ** SQUARENESS,
    halfDepth * Math.sign(s) * Math.abs(s) ** SQUARENESS,
  );
}

interface Sample {
  readonly at: number;
  readonly cx: number;
  readonly halfWidth: number;
  readonly halfDepth: number;
}

/**
 * The profile, sampled fine and then smoothed.
 *
 * The bands are linear between control points, which shows as a crease at every
 * band once a material is catching light on it. A short moving average costs
 * nothing and removes them without needing a spline.
 */
function sampleProfile(part: BodyPart, side: -1 | 1, steps: number): readonly Sample[] {
  const [from, to] = PART_RANGE[part];
  const raw: Sample[] = [];

  for (let i = 0; i <= steps; i += 1) {
    const at = from + ((to - from) * i) / steps;
    const section = crossSectionAt(part, at, side);
    raw.push({ at, cx: section.cx, halfWidth: section.halfWidth, halfDepth: section.halfDepth });
  }

  const window = 4;
  return raw.map((sample, index) => {
    let width = 0;
    let depth = 0;
    let count = 0;
    for (let k = -window; k <= window; k += 1) {
      const neighbour = raw[Math.min(raw.length - 1, Math.max(0, index + k))];
      if (neighbour === undefined) continue;
      width += neighbour.halfWidth;
      depth += neighbour.halfDepth;
      count += 1;
    }
    return { ...sample, halfWidth: width / count, halfDepth: depth / count };
  });
}

/** Stitch a ladder of rings into a closed, capped surface. */
function stitch(
  rings: readonly (readonly THREE.Vector3[])[],
  radial: number,
  caps: { readonly start: boolean; readonly end: boolean } = { start: true, end: true },
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (const [row, ring] of rings.entries()) {
    for (const point of ring) {
      positions.push(point.x, point.y, point.z);
      uvs.push(0, row / Math.max(1, rings.length - 1));
    }
  }

  const stride = radial + 1;
  for (let row = 0; row < rings.length - 1; row += 1) {
    for (let r = 0; r < radial; r += 1) {
      const a = row * stride + r;
      const b = a + stride;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  // Caps, so an end is a closed surface rather than a hole a transmissive
  // material would show straight through.
  for (const edge of [0, rings.length - 1] as const) {
    if (edge === 0 ? !caps.start : !caps.end) continue;
    const ring = rings[edge];
    if (ring === undefined) continue;
    const centre = new THREE.Vector3();
    for (let r = 0; r < radial; r += 1) centre.add(ring[r] ?? new THREE.Vector3());
    centre.divideScalar(radial);

    const centreIndex = positions.length / 3;
    positions.push(centre.x, centre.y, centre.z);
    uvs.push(0.5, edge === 0 ? 0 : 1);

    for (let r = 0; r < radial; r += 1) {
      const a = edge * stride + r;
      if (edge === 0) indices.push(centreIndex, a, a + 1);
      else indices.push(centreIndex, a + 1, a);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Loft a profiled part, placing each rim point through the caller's mapping. */
function loft(
  samples: readonly Sample[],
  place: (sample: Sample, flat: THREE.Vector2) => THREE.Vector3,
  caps: { readonly start: boolean; readonly end: boolean } = { start: true, end: true },
): THREE.BufferGeometry {
  const rings = samples.map((sample) => {
    const ring: THREE.Vector3[] = [];
    for (let r = 0; r <= RADIAL; r += 1) {
      const angle = (r / RADIAL) * Math.PI * 2;
      ring.push(place(sample, rim(sample.cx, sample.halfWidth, sample.halfDepth, angle)));
    }
    return ring;
  });
  return stitch(rings, RADIAL, caps);
}

/**
 * A finger, a thumb, or anything else small and round pointing somewhere.
 *
 * Built along an arbitrary direction rather than down the limb axis, because a
 * thumb that runs parallel to the fingers is a fifth finger — the angle away
 * from the palm is the whole reason a hand reads as a hand.
 */
function digit(
  start: THREE.Vector3,
  direction: THREE.Vector3,
  length: number,
  radius: number,
): THREE.BufferGeometry {
  const forward = direction.clone().normalize();
  const seed = Math.abs(forward.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const sideAxis = new THREE.Vector3().crossVectors(forward, seed).normalize();
  const upAxis = new THREE.Vector3().crossVectors(sideAxis, forward).normalize();

  const steps = 10;
  const rings: THREE.Vector3[][] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    // Slightly barrelled, then rounded off at the tip — a straight cone reads as
    // a spike and a straight cylinder reads as a peg.
    const scale = (0.82 + 0.28 * Math.sin(Math.PI * Math.min(1, t * 1.15))) * (1 - t * t * 0.55);
    const centre = start.clone().addScaledVector(forward, (length / UNITS) * t);
    const ring: THREE.Vector3[] = [];
    for (let r = 0; r <= DIGIT_RADIAL; r += 1) {
      const angle = (r / DIGIT_RADIAL) * Math.PI * 2;
      ring.push(
        centre
          .clone()
          .addScaledVector(sideAxis, (Math.cos(angle) * radius * scale) / UNITS)
          .addScaledVector(upAxis, (Math.sin(angle) * radius * scale * 0.85) / UNITS),
      );
    }
    rings.push(ring);
  }
  return stitch(rings, DIGIT_RADIAL);
}

/** Torso and legs, in world space. */
export function buildBodyGeometries(): readonly THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [
    loft(sampleProfile('TORSO', -1, 190), (sample, flat) => toWorld(flat.x, sample.at, flat.y)),
  ];
  for (const side of [-1, 1] as const) {
    parts.push(
      loft(sampleProfile('LEG', side, 120), (sample, flat) => toWorld(flat.x, sample.at, flat.y)),
    );
  }
  return parts;
}

/**
 * One arm with its hand, in the arm's own space with the joint at the origin.
 *
 * Built PER SIDE, and that is not symmetry for its own sake: a thumb sits on the
 * inner edge of a hand. Sharing one geometry between both arms and mirroring by
 * rotation alone put one thumb inboard and the other outboard.
 */
export function buildArmGeometry(side: -1 | 1): readonly THREE.BufferGeometry[] {
  /*
   * The arm's far end and the palm's near end are NOT capped. They meet on the
   * same ring at the wrist, so two coincident discs facing opposite ways sat
   * there z-fighting and drew a bright seam right where the cuff is measured.
   */
  const parts: THREE.BufferGeometry[] = [
    loft(
      sampleProfile('ARM', -1, 90),
      (sample, flat) => limbLocal(sample.at, flat.x, flat.y),
      { start: true, end: false },
    ),
    loft(
      sampleProfile('HAND', -1, 40),
      (sample, flat) => limbLocal(sample.at, flat.x, flat.y),
      { start: false, end: true },
    ),
  ];

  for (const [lateral, length, radius] of FINGERS) {
    // A slight fan so they are not four parallel pegs, and a forward lean so the
    // hand reads as relaxed rather than rigidly splayed.
    const spread = lateral * 0.012;
    parts.push(
      digit(
        limbLocal(KNUCKLE_ALONG - 3, lateral, 0.5),
        new THREE.Vector3(spread, -0.94, 0.33),
        length,
        radius,
      ),
    );
  }

  // Inboard: toward the body, which is +x on the reading-start arm.
  const inward = -side;
  parts.push(
    digit(
      limbLocal(THUMB.along, inward * THUMB.lateral * 0.55, 2),
      new THREE.Vector3(inward * 0.62, -0.72, 0.3),
      THUMB.length,
      THUMB.radius,
    ),
  );

  return parts;
}

/** One foot, in its own space with the ankle at the origin and the toes forward. */
export function buildFootGeometry(): THREE.BufferGeometry {
  return loft(sampleProfile('FOOT', -1, 40), (sample, flat) =>
    // The foot's own axis runs FORWARD, so its profile maps to z rather than y.
    new THREE.Vector3(
      flat.x / UNITS,
      (flat.y - FOOT_ANCHOR.drop) / UNITS,
      (sample.at - FOOT_ANCHOR.back) / UNITS,
    ),
  );
}

/** The depth of the body's surface at a height and horizontal position. */
function surfaceDepth(part: 'TORSO' | 'LEG', at: number, x: number): number {
  const section = crossSectionAt(part, at, -1);
  const across = Math.min(1, Math.abs(x - section.cx) / Math.max(section.halfWidth, 0.001));
  return section.halfDepth * Math.sqrt(Math.max(0, 1 - across * across));
}

/** Clearance so a tape rests ON the body rather than inside it. */
const TAPE_LIFT = 1.8;

/**
 * The path a tape follows, in whichever space its measurement lives in.
 *
 * A girth closes around the real cross-section. A length rides the surface
 * between its ends rather than cutting the corner — which is what keeps a kameez
 * tape on the chest instead of floating in front of it.
 */
export function tapeCurve(point: MeasurementPoint): THREE.CatmullRomCurve3 {
  if (point.kind === 'GIRTH' && point.space === 'ARM') {
    const section = crossSectionAt('ARM', point.along);
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < 72; i += 1) {
      const flat = rim(
        0,
        section.halfWidth + TAPE_LIFT,
        section.halfDepth + TAPE_LIFT,
        (i / 72) * Math.PI * 2,
      );
      points.push(limbLocal(point.along, flat.x, flat.y));
    }
    return new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.4);
  }

  if (point.kind === 'GIRTH') {
    const section = crossSectionAt(point.part, point.at, point.side);
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < 96; i += 1) {
      const flat = rim(
        section.cx,
        section.halfWidth + TAPE_LIFT,
        section.halfDepth + TAPE_LIFT,
        (i / 96) * Math.PI * 2,
      );
      points.push(toWorld(flat.x, section.at, flat.y));
    }
    return new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.4);
  }

  if (point.space === 'ARM') {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 32; i += 1) {
      const along = point.along1 + (point.along2 - point.along1) * (i / 32);
      const section = crossSectionAt('ARM', along);
      points.push(limbLocal(along, 0, section.halfDepth + TAPE_LIFT));
    }
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.4);
  }

  const points: THREE.Vector3[] = [];
  const behind = point.z < 0;
  for (let i = 0; i <= 48; i += 1) {
    const t = i / 48;
    const x = point.x1 + (point.x2 - point.x1) * t;
    const y = point.y1 + (point.y2 - point.y1) * t;
    const part = y > 212 ? 'LEG' : 'TORSO';
    const depth = surfaceDepth(part, y, x) + TAPE_LIFT;
    points.push(toWorld(x, y, behind ? -depth : depth));
  }
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.4);
}

/** Where a marker sits: on the skin, at the middle of the measurement. */
export function markerPosition(point: MeasurementPoint): THREE.Vector3 {
  if (point.kind === 'GIRTH' && point.space === 'ARM') {
    const section = crossSectionAt('ARM', point.along);
    return limbLocal(point.along, 0, section.halfDepth + TAPE_LIFT);
  }

  if (point.kind === 'GIRTH') {
    const section = crossSectionAt(point.part, point.at, point.side);
    return toWorld(section.cx, section.at, section.halfDepth + TAPE_LIFT);
  }

  if (point.space === 'ARM') {
    const along = (point.along1 + point.along2) / 2;
    const section = crossSectionAt('ARM', along);
    return limbLocal(along, 0, section.halfDepth + TAPE_LIFT);
  }

  const x = (point.x1 + point.x2) / 2;
  const y = (point.y1 + point.y2) / 2;
  const part = y > 212 ? 'LEG' : 'TORSO';
  const depth = surfaceDepth(part, y, x) + TAPE_LIFT;
  return toWorld(x, y, point.z < 0 ? -depth : depth);
}

/**
 * Where an arm measurement's marker ends up once the arm has taken its pose.
 *
 * The camera needs this because an arm point is authored in the LIMB's space: at
 * a T-pose the wrist is a metre and a half off the centre line, so framing on
 * the shoulder — or on the figure's axis — put the cuff tape off the edge of the
 * stage with only its glow showing.
 */
export function armMarkerWorld(
  point: MeasurementPoint,
  liftDegrees: number,
  side: -1 | 1,
): THREE.Vector3 {
  const local = markerPosition(point);
  const angle = (side * liftDegrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return shoulderWorld(side)
    .clone()
    .add(new THREE.Vector3(local.x * cos - local.y * sin, local.x * sin + local.y * cos, local.z));
}

/** Whether a measurement belongs to the arm, and so moves when the arm moves. */
export function isArmPoint(point: MeasurementPoint): boolean {
  return point.space === 'ARM';
}
