import * as THREE from 'three';

import { WRIST_ALONG } from './body-profile';
import {
  armAxis,
  sliceExtent,
  sliceHull,
  slicePerpendicular,
  surfaceAt,
  type Axis,
  type MeshAnatomy,
} from './mesh-anatomy';
import type { MeasurementPoint } from './measurement-points';

/**
 * Tapes taken off the loaded figure instead of off the profile table.
 *
 * This is what makes a measurement true of the body on screen rather than of the
 * idealised one the geometry used to be generated from. It is also the answer to
 * a shoulder ring that floated behind the back and an armhole that cut a flat
 * circle through a limb held at an angle: neither was a rendering fault, both
 * were the consequence of describing a body instead of reading one.
 */

/** Figure-space height to world, matching `body-mesh`'s own mapping. */
function worldY(at: number): number {
  return (420 - at) / 100;
}

/** Clearance so a tape rests ON the surface rather than inside it. */
const LIFT = 1.014;

export interface MeshTapes {
  readonly anatomy: MeshAnatomy;
  readonly left: Axis | null;
  readonly right: Axis | null;
}

export function readTapes(root: THREE.Object3D, anatomy: MeshAnatomy): MeshTapes {
  return { anatomy, left: armAxis(anatomy, 'LEFT'), right: armAxis(anatomy, 'RIGHT') };
}

/** Push a closed ring very slightly outward from its own centre. */
function lift(points: readonly THREE.Vector3[]): THREE.Vector3[] {
  const centre = new THREE.Vector3();
  for (const point of points) centre.add(point);
  centre.divideScalar(points.length);
  return points.map((point) => centre.clone().addScaledVector(point.clone().sub(centre), LIFT));
}

/**
 * The half of a closed ring that passes behind the body.
 *
 * A shoulder width is taken across the BACK, so the tape has to travel the rear
 * arc between the two acromion points rather than the front one — and the ring
 * is a hull, so both arcs are available and only one of them is right.
 */
function backArc(hull: readonly THREE.Vector3[]): THREE.Vector3[] {
  let leftIndex = 0;
  let rightIndex = 0;
  hull.forEach((point, index) => {
    const left = hull[leftIndex];
    const right = hull[rightIndex];
    if (left !== undefined && point.x < left.x) leftIndex = index;
    if (right !== undefined && point.x > right.x) rightIndex = index;
  });

  const walk = (from: number, to: number): THREE.Vector3[] => {
    const path: THREE.Vector3[] = [];
    for (let i = from; ; i = (i + 1) % hull.length) {
      const point = hull[i];
      if (point !== undefined) path.push(point);
      if (i === to) break;
      if (path.length > hull.length) break;
    }
    return path;
  };

  const forward = walk(leftIndex, rightIndex);
  const backward = walk(rightIndex, leftIndex).reverse();
  const meanZ = (path: readonly THREE.Vector3[]): number =>
    path.reduce((total, point) => total + point.z, 0) / Math.max(1, path.length);

  return meanZ(forward) < meanZ(backward) ? forward : backward;
}

/**
 * The path a tape takes on the loaded figure, or `null` when the mesh cannot
 * answer — a height that misses the model, or an arm still flush against the
 * body, where a slice cannot tell limb from ribcage.
 */
export function meshTapeCurve(
  tapes: MeshTapes,
  point: MeasurementPoint,
): THREE.CatmullRomCurve3 | null {
  const { anatomy } = tapes;

  if (point.space === 'ARM') {
    const axis = tapes.left;
    if (axis === null) return null;
    const scale = axis.length / WRIST_ALONG;

    if (point.kind === 'GIRTH') {
      const hull = slicePerpendicular(anatomy, axis, point.along * scale);
      if (hull === null) return null;
      return new THREE.CatmullRomCurve3(lift(hull), true, 'catmullrom', 0.4);
    }

    const path: THREE.Vector3[] = [];
    for (let i = 0; i <= 20; i += 1) {
      const along = (point.along1 + (point.along2 - point.along1) * (i / 20)) * scale;
      const ring = slicePerpendicular(anatomy, axis, along);
      if (ring === null) continue;
      // Along the OUTER face of the limb, which is the side a sleeve is measured
      // down and the side a viewer can see.
      const outer = ring.reduce((best, candidate) => (candidate.z > best.z ? candidate : best));
      path.push(outer);
    }
    if (path.length < 4) return null;
    return new THREE.CatmullRomCurve3(path, false, 'catmullrom', 0.4);
  }

  if (point.kind === 'GIRTH') {
    const hull = sliceHull(anatomy, worldY(point.at), 'TORSO');
    if (hull === null) return null;
    return new THREE.CatmullRomCurve3(lift(hull), true, 'catmullrom', 0.4);
  }

  if (point.kind === 'WIDTH') {
    const hull = sliceHull(anatomy, worldY(point.y1), 'TORSO');
    if (hull === null) return null;
    const arc = backArc(hull);
    if (arc.length < 3) return null;
    return new THREE.CatmullRomCurve3(lift(arc), false, 'catmullrom', 0.4);
  }

  const path: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i += 1) {
    const t = i / 24;
    const y = worldY(point.y1 + (point.y2 - point.y1) * t);
    const x = (point.x1 + (point.x2 - point.x1) * t - 100) / 100;
    const depth = surfaceAt(anatomy, y, x);
    if (depth === null) continue;
    path.push(new THREE.Vector3(x, y, depth * LIFT));
  }
  if (path.length < 4) return null;
  return new THREE.CatmullRomCurve3(path, false, 'catmullrom', 0.4);
}

/** Where a marker sits on the loaded figure: the middle of its own tape. */
export function meshMarkerPosition(
  tapes: MeshTapes,
  point: MeasurementPoint,
): THREE.Vector3 | null {
  if (point.kind === 'WIDTH') {
    const extent = sliceExtent(tapes.anatomy, worldY(point.y1));
    if (extent === null) return null;
    return extent.left.clone().lerp(extent.right, 0.5).multiplyScalar(1).setZ(extent.left.z * LIFT);
  }

  const curve = meshTapeCurve(tapes, point);
  if (curve === null) return null;
  // A girth's marker belongs on the front of the ring, where it can be seen and
  // clicked; a length's belongs halfway along it.
  if (point.kind === 'GIRTH') {
    const points = curve.getPoints(48);
    return points.reduce((best, candidate) => (candidate.z > best.z ? candidate : best));
  }
  return curve.getPointAt(0.5);
}
