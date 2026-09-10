import * as THREE from 'three';

/**
 * Measuring a real mesh, rather than a table that describes one.
 *
 * Every girth here is the CONVEX HULL of a cross-section, and that is not a
 * shortcut — it is what a tape does. A tape pulled tight bridges every hollow it
 * crosses: it spans the small of the back rather than dipping into it, and it
 * spans the gap between the pectorals rather than following the sternum. A curve
 * that traced the surface faithfully would read low on every measurement, and
 * would be wrong in the direction that produces a garment too tight to wear.
 *
 * Pure: no React, no DOM. `three` only for its vector and geometry types.
 */

/** Every vertex of the figure, in world space, kept flat for cheap scanning. */
export interface MeshAnatomy {
  readonly positions: Float32Array;
  readonly minY: number;
  readonly maxY: number;
}

/** Read a loaded model into a single world-space point cloud. */
export function readAnatomy(root: THREE.Object3D): MeshAnatomy {
  root.updateWorldMatrix(true, true);

  const collected: number[] = [];
  let minY = Infinity;
  let maxY = -Infinity;
  const vertex = new THREE.Vector3();

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const attribute = child.geometry.getAttribute('position');
    if (attribute === undefined) return;

    for (let i = 0; i < attribute.count; i += 1) {
      vertex.fromBufferAttribute(attribute, i).applyMatrix4(child.matrixWorld);
      collected.push(vertex.x, vertex.y, vertex.z);
      if (vertex.y < minY) minY = vertex.y;
      if (vertex.y > maxY) maxY = vertex.y;
    }
  });

  return { positions: new Float32Array(collected), minY, maxY };
}

/** Which part of the body a slice should keep, when a height crosses several. */
export type SliceRegion = 'TORSO' | 'LEFT' | 'RIGHT';

interface Point2 {
  readonly x: number;
  readonly z: number;
}

/**
 * The points of one horizontal slice, split into the parts that height crosses.
 *
 * At chest height a slice catches the ribcage AND both arms. Grouping by gaps
 * along the lateral axis separates them, which is what lets a chest measurement
 * ignore the arms without the mesh having been segmented by whoever built it.
 */
function clusters(points: readonly Point2[]): Point2[][] {
  if (points.length === 0) return [];
  const sorted = [...points].sort((a, b) => a.x - b.x);
  const groups: Point2[][] = [];
  let current: Point2[] = [];
  let previous = Number.NaN;

  for (const point of sorted) {
    // A limb clear of the body leaves a lateral gap far wider than the spacing
    // between neighbouring vertices on one surface.
    if (!Number.isNaN(previous) && point.x - previous > 0.055 && current.length > 0) {
      groups.push(current);
      current = [];
    }
    current.push(point);
    previous = point.x;
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

/** Andrew's monotone chain. The tape, in other words. */
function convexHull(points: readonly Point2[]): Point2[] {
  if (points.length < 3) return [...points];
  const sorted = [...points].sort((a, b) => (a.x === b.x ? a.z - b.z : a.x - b.x));

  const cross = (o: Point2, a: Point2, b: Point2): number =>
    (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);

  const build = (source: readonly Point2[]): Point2[] => {
    const chain: Point2[] = [];
    for (const point of source) {
      while (chain.length >= 2) {
        const a = chain[chain.length - 2];
        const b = chain[chain.length - 1];
        if (a === undefined || b === undefined || cross(a, b, point) > 0) break;
        chain.pop();
      }
      chain.push(point);
    }
    chain.pop();
    return chain;
  };

  return [...build(sorted), ...build([...sorted].reverse())];
}

/**
 * A slice of the body at one height, as the closed path a tape would take.
 *
 * The slab thickens until it has caught enough of the surface to be a shape
 * rather than a scatter — vertex density varies enormously across a model, and a
 * fixed thickness that works at the waist finds four points at the wrist.
 */
export function sliceHull(
  anatomy: MeshAnatomy,
  y: number,
  region: SliceRegion = 'TORSO',
): THREE.Vector3[] | null {
  const { positions } = anatomy;

  for (const halfThickness of [0.012, 0.02, 0.032, 0.05]) {
    const found: Point2[] = [];
    for (let i = 0; i < positions.length; i += 3) {
      const py = positions[i + 1];
      if (py === undefined || Math.abs(py - y) > halfThickness) continue;
      const px = positions[i];
      const pz = positions[i + 2];
      if (px === undefined || pz === undefined) continue;
      found.push({ x: px, z: pz });
    }
    if (found.length < 24) continue;

    const groups = clusters(found);
    if (groups.length === 0) continue;

    let chosen: Point2[] | undefined;
    if (region === 'TORSO') {
      // The part straddling the centre line, which the arms never do.
      chosen = groups.reduce((best, group) => {
        const near = (candidate: Point2[]): number =>
          Math.min(...candidate.map((point) => Math.abs(point.x)));
        return near(group) < near(best) ? group : best;
      });
    } else {
      chosen = region === 'LEFT' ? groups[0] : groups[groups.length - 1];
      // With the arm still against the body there is only one group, and taking
      // it would measure the whole torso and call it an arm.
      if (groups.length < 2) chosen = undefined;
    }
    // Eight, not twelve: a forearm slab holds far fewer vertices than a waist
    // one, and the stricter floor made the arm drop out at scattered heights.
    if (chosen === undefined || chosen.length < 8) continue;

    const hull = convexHull(chosen);
    if (hull.length < 6) continue;

    return hull.map((point) => new THREE.Vector3(point.x, y, point.z));
  }

  return null;
}

/**
 * The widest points of a slice, which is where a width measurement ends.
 *
 * The shoulder used to be a bar drawn at a depth somebody chose; now it lands on
 * the acromion the model actually has.
 */
export function sliceExtent(
  anatomy: MeshAnatomy,
  y: number,
): { readonly left: THREE.Vector3; readonly right: THREE.Vector3 } | null {
  const hull = sliceHull(anatomy, y, 'TORSO');
  if (hull === null) return null;

  let left = hull[0];
  let right = hull[0];
  if (left === undefined || right === undefined) return null;
  for (const point of hull) {
    if (point.x < left.x) left = point;
    if (point.x > right.x) right = point;
  }
  return { left, right };
}

/** The depth of the body at a height and lateral position, on the near side. */
export function surfaceAt(anatomy: MeshAnatomy, y: number, x: number): number | null {
  const hull = sliceHull(anatomy, y, 'TORSO');
  if (hull === null) return null;

  let best: THREE.Vector3 | undefined;
  let bestDistance = Infinity;
  for (const point of hull) {
    if (point.z <= 0) continue;
    const distance = Math.abs(point.x - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = point;
    }
  }
  return best?.z ?? null;
}

/** The line an arm runs along, found from the mesh rather than assumed. */
export interface Axis {
  readonly origin: THREE.Vector3;
  readonly direction: THREE.Vector3;
  readonly length: number;
}

/**
 * Where an arm actually is, traced from the model.
 *
 * The pose an artist left an arm in is not knowable in advance — this one sits
 * at roughly forty-five degrees, nothing like the eleven the procedural figure
 * hung at — so the axis is measured by following the limb's cluster down from
 * the shoulder and fitting a line through where it goes.
 */
export function armAxis(anatomy: MeshAnatomy, side: 'LEFT' | 'RIGHT'): Axis | null {
  const top = anatomy.minY + (anatomy.maxY - anatomy.minY) * 0.80;
  const bottom = anatomy.minY + (anatomy.maxY - anatomy.minY) * 0.42;

  const centroids: THREE.Vector3[] = [];
  let misses = 0;

  for (let i = 0; i <= 28; i += 1) {
    const y = top + ((bottom - top) * i) / 28;
    const hull = sliceHull(anatomy, y, side);

    /*
     * A limb is a CONNECTED RUN, and that is the only reliable way to find where
     * it ends. Below the hand there is no arm, so the outermost cluster becomes a
     * LEG — and a leg is neither far enough from the axis nor far enough from the
     * last arm slice for a threshold to catch every time.
     *
     * An absolute jump test was tried first and was worse than useless: the slice
     * misses at scattered heights inside the arm, so the next real centroid is a
     * whole gap away and the guard fired on a legitimate step. It collected ONE
     * centroid and gave up.
     */
    if (hull === null) {
      misses += 1;
      if (centroids.length > 0 && misses >= 2) break;
      continue;
    }
    misses = 0;

    const centre = new THREE.Vector3();
    for (const point of hull) centre.add(point);
    centre.divideScalar(hull.length);

    // Cheap sanity check on top: nothing this close to the axis is a limb held
    // out from the body.
    if (Math.abs(centre.x) < 0.22) break;

    centroids.push(centre);
  }

  /*
   * Truncate where the run stops travelling OUTWARD.
   *
   * An arm leaves the shoulder and moves away from the axis all the way to the
   * wrist — in every pose a mannequin is ever left in. So the moment a centroid
   * comes back inward, the run has stopped following the arm, whatever it has
   * started following instead. Without this the fitted direction came back
   * pointing at the body: origin at x -0.73 and a direction of +0.47, an arm
   * apparently growing into the ribcage.
   */
  const outward: THREE.Vector3[] = [];
  let reach = 0;
  for (const centroid of centroids) {
    const distance = Math.abs(centroid.x);
    if (outward.length > 0 && distance < reach - 0.02) break;
    reach = Math.max(reach, distance);
    outward.push(centroid);
  }

  const first = outward[0];
  const last = outward[outward.length - 1];
  if (first === undefined || last === undefined || outward.length < 4) return null;

  const direction = last.clone().sub(first);
  const length = direction.length();
  if (length < 0.2) return null;

  return { origin: first, direction: direction.divideScalar(length), length };
}

/**
 * A slice taken square to a limb rather than square to the world.
 *
 * A flat cut through an arm held at forty-five degrees returns an ellipse half
 * again too long, and a cuff measured off it would be nonsense. Projecting into
 * the plane normal to the limb is what makes the number mean anything.
 */
export function slicePerpendicular(
  anatomy: MeshAnatomy,
  axis: Axis,
  along: number,
  maxRadius = 0.22,
): THREE.Vector3[] | null {
  const { positions } = anatomy;
  const centre = axis.origin.clone().addScaledVector(axis.direction, along);

  const seed =
    Math.abs(axis.direction.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const uAxis = new THREE.Vector3().crossVectors(axis.direction, seed).normalize();
  const vAxis = new THREE.Vector3().crossVectors(uAxis, axis.direction).normalize();

  const vertex = new THREE.Vector3();
  for (const halfThickness of [0.012, 0.02, 0.032]) {
    const found: Point2[] = [];
    for (let i = 0; i < positions.length; i += 3) {
      const px = positions[i];
      const py = positions[i + 1];
      const pz = positions[i + 2];
      if (px === undefined || py === undefined || pz === undefined) continue;
      vertex.set(px - centre.x, py - centre.y, pz - centre.z);
      if (Math.abs(vertex.dot(axis.direction)) > halfThickness) continue;
      const u = vertex.dot(uAxis);
      const v = vertex.dot(vAxis);
      // Anything further out belongs to the body, not to this limb.
      if (Math.hypot(u, v) > maxRadius) continue;
      found.push({ x: u, z: v });
    }
    if (found.length < 12) continue;

    const hull = convexHull(found);
    if (hull.length < 5) continue;

    return hull.map((point) =>
      centre.clone().addScaledVector(uAxis, point.x).addScaledVector(vAxis, point.z),
    );
  }

  return null;
}
