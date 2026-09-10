'use client';

import { useEffect, useRef } from 'react';

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

import {
  ankleWorld,
  armMarkerWorld,
  buildArmGeometry,
  buildBodyGeometries,
  buildFootGeometry,
  isArmPoint,
  markerPosition,
  shoulderWorld,
  tapeCurve,
} from '../lib/body-mesh';
import { ARM_REST_ANGLE } from '../lib/body-profile';
import { readAnatomy } from '../lib/mesh-anatomy';
import { meshMarkerPosition, meshTapeCurve, readTapes, type MeshTapes } from '../lib/mesh-tape';
import { MEASUREMENT_POINTS, type MeasurementPointId } from '../lib/measurement-points';

export interface MeasurementStageProps {
  readonly activePointId: MeasurementPointId | null;
  readonly filledIds: ReadonlySet<MeasurementPointId>;
  readonly onSelect: (pointId: MeasurementPointId) => void;
}

/** Framing when nothing is chosen: the whole figure, a little above eye level. */
const REST = {
  azimuth: -0.42,
  polar: 1.48,
  radius: 9.1,
  targetX: 0,
  targetY: 2.1,
  lift: ARM_REST_ANGLE,
};

/** How close the camera comes for one measurement. */
const CLOSE_RADIUS = 4.1;

/** Further out for an arm: at a T-pose the limb reaches well past the body. */
const ARM_RADIUS = 5.6;

const TWEEN_MS = 950;
const DEG = Math.PI / 180;

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - 2 ** (-10 * t);
}

/**
 * How dark the page currently is, read from the page itself.
 *
 * Taken from the computed background rather than from `prefers-color-scheme` or
 * the theme attribute, because the store has three states — light, dark, and
 * follow-the-system — and the resolved background is the only thing that knows
 * the answer in all three.
 */
function pageIsDark(): boolean {
  const parsed = /rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(
    getComputedStyle(document.body).backgroundColor,
  );
  if (parsed === null) return true;
  const r = Number(parsed[1]);
  const g = Number(parsed[2]);
  const b = Number(parsed[3]);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
}

/**
 * Resolve a design token to an `rgb()` string.
 *
 * Through a probe element rather than by reading the custom property directly:
 * the tokens are authored in `oklch`, and a canvas gradient will not take that
 * everywhere. Letting the browser resolve it gives a value canvas always accepts.
 */
function resolveToken(name: string): string {
  const probe = document.createElement('div');
  probe.style.cssText = `position:absolute;visibility:hidden;background-color:var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

/**
 * The studio backdrop, painted into the scene rather than left to the page.
 *
 * `EffectComposer` writes an opaque full-screen result, so wherever nothing was
 * drawn the canvas came back BLACK — which is why the stage stayed dark on a
 * light page however the CSS behind it was themed. Giving the scene its own
 * background fixes it at the source and gives the figure something to stand in.
 */
function makeBackdrop(dark: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx !== null) {
    ctx.fillStyle = resolveToken('--color-surface-muted');
    ctx.fillRect(0, 0, 256, 256);

    const glow = ctx.createRadialGradient(128, 112, 8, 128, 112, 168);
    glow.addColorStop(0, dark ? 'rgba(28,120,98,0.55)' : 'rgba(18,90,74,0.16)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 256, 256);

    const vignette = ctx.createLinearGradient(0, 0, 0, 256);
    vignette.addColorStop(0, dark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.06)');
    vignette.addColorStop(0.45, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, dark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * The mannequin, as a real scene.
 *
 * The arms hang from a pivot rather than being baked into the body, so the model
 * can take the pose the measurement actually needs — arms up for a chest, out to
 * a T for a sleeve. That is the same instruction a tailor gives out loud, given
 * by showing rather than telling.
 */
export function MeasurementStage({ activePointId, filledIds, onSelect }: MeasurementStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{
    focus: (id: MeasurementPointId | null) => void;
    mark: (filled: ReadonlySet<MeasurementPointId>, active: MeasurementPointId | null) => void;
  } | null>(null);

  /* The scene is built once and never rebuilt, so the callback reaches it
     through a ref. Written in an effect, not during render (react-hooks/refs). */
  const selectRef = useRef(onSelect);
  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'pan-y';
    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.08).texture;

    // ---- body -----------------------------------------------------------
    const skin = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#12463c'),
      transmission: 0.62,
      thickness: 2.1,
      roughness: 0.42,
      metalness: 0,
      ior: 1.42,
      clearcoat: 0.7,
      clearcoatRoughness: 0.45,
      attenuationColor: new THREE.Color('#0a3f34'),
      attenuationDistance: 0.9,
      side: THREE.DoubleSide,
    });

    const bodyGeometries = buildBodyGeometries();
    for (const geometry of bodyGeometries) scene.add(new THREE.Mesh(geometry, skin));

    // ---- arms and hands, on pivots ---------------------------------------
    // Built per side: a thumb sits on the INNER edge of a hand, so one shared
    // geometry mirrored by rotation puts one thumb inboard and one outboard.
    const armGeometries = new Map<-1 | 1, readonly THREE.BufferGeometry[]>();
    // Big enough to swallow the arm's top cap, small enough not to bulge past the
    // shoulder line — at 0.2 it stood proud of the torso as a visible knob.
    const shoulderGeometry = new THREE.SphereGeometry(0.16, 32, 24);
    const armGroups = new Map<-1 | 1, THREE.Group>();

    for (const side of [-1, 1] as const) {
      const geometries = buildArmGeometry(side);
      armGeometries.set(side, geometries);

      const group = new THREE.Group();
      group.position.copy(shoulderWorld(side));
      for (const geometry of geometries) group.add(new THREE.Mesh(geometry, skin));
      // Fills the socket, so a raised arm does not open a gap at the shoulder.
      group.add(new THREE.Mesh(shoulderGeometry, skin));
      armGroups.set(side, group);
      scene.add(group);
    }

    // ---- feet --------------------------------------------------------------
    // Their own parts rather than more leg: a foot runs FORWARD from the ankle,
    // and a profile swept downward can only ever produce a stump.
    const footGeometry = buildFootGeometry();
    for (const side of [-1, 1] as const) {
      const foot = new THREE.Mesh(footGeometry, skin);
      foot.position.copy(ankleWorld(side));
      // Toes turned very slightly outward, which is how a person stands.
      foot.rotation.y = side * 0.12;
      scene.add(foot);
    }

    /*
     * SPIKE — an operator-supplied mesh, swapped in over the procedural figure so
     * it can be looked at. Not a decision yet: the file is a Spider-Man base mesh
     * out of GTA, so its provenance has to be settled before anything ships, and
     * it carries no skeleton, so the arm posing is inert while it is in.
     */
    const procedural: THREE.Object3D[] = [...scene.children];
    let supplied: THREE.Group | null = null;
    /* Null until the figure has loaded and been read. Everything falls back to
       the profile table until then, so the page is never empty or wrong-looking
       while the download is in flight. */
    let tapes: MeshTapes | null = null;

    new OBJLoader().load('/models/figure.obj', (group) => {
      const box = new THREE.Box3().setFromObject(group);
      const size = new THREE.Vector3();
      const centre = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(centre);

      // Normalised to the figure the measurements already assume: same height,
      // centred on the axis, standing on the ground plane.
      const scale = size.y === 0 ? 1 : 4.14 / size.y;
      group.scale.setScalar(scale);
      group.position.set(-centre.x * scale, -box.min.y * scale, -centre.z * scale);

      group.traverse((child) => {
        if (child instanceof THREE.Mesh) child.material = skin;
      });

      for (const object of procedural) object.visible = false;
      supplied = group;
      scene.add(group);

      // Read once. Sixteen thousand vertices scanned per slice is cheap; doing
      // it per frame would not be, and the figure never changes shape.
      tapes = readTapes(group, readAnatomy(group));
      placeMarkers();
      showTape(activeRef.current);
    });

    // ---- light -----------------------------------------------------------
    const key = new THREE.DirectionalLight('#fff6ea', 2.6);
    key.position.set(-3.2, 5.4, 4.6);
    scene.add(key);

    const rim = new THREE.DirectionalLight('#ffc266', 4.2);
    rim.position.set(3.6, 2.6, -4.2);
    scene.add(rim);

    const fill = new THREE.DirectionalLight('#3fd6b0', 1.1);
    fill.position.set(4.2, 1.2, 3.4);
    scene.add(fill);

    const ambient = new THREE.AmbientLight('#132a26', 1.4);
    scene.add(ambient);

    // A soft pool under the figure so it stands on something.
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext('2d');
    if (ctx !== null) {
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(0,0,0,0.55)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }
    const poolMaterial = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(shadowCanvas),
      transparent: true,
      depthWrite: false,
    });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), poolMaterial);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.16;
    scene.add(pool);

    // ---- markers ---------------------------------------------------------
    const markerGeometry = new THREE.SphereGeometry(0.034, 18, 18);
    const markers = new Map<
      MeasurementPointId,
      THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>
    >();
    const pickable: THREE.Object3D[] = [];
    const leftArm = armGroups.get(-1);

    for (const point of MEASUREMENT_POINTS) {
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#54635f'),
        emissive: new THREE.Color('#000000'),
        roughness: 0.5,
        metalness: 0.2,
      });
      const mesh = new THREE.Mesh(markerGeometry, material);
      mesh.position.copy(markerPosition(point));
      mesh.userData = { id: point.id };
      markers.set(point.id, mesh);
      pickable.push(mesh);
      // An arm marker is a CHILD of the arm, so it rides with the pose instead
      // of being left behind in mid-air when the arm lifts.
      if (isArmPoint(point) && leftArm !== undefined) leftArm.add(mesh);
      else scene.add(mesh);
    }

    /**
     * Move every marker onto the loaded figure.
     *
     * They are reparented to the scene at the same time: the supplied mesh has
     * no skeleton, so the arm group no longer moves, and a marker left inside it
     * would sit wherever the procedural arm used to hang.
     */
    function placeMarkers(): void {
      if (tapes === null) return;
      for (const point of MEASUREMENT_POINTS) {
        const mesh = markers.get(point.id);
        if (mesh === undefined) continue;
        const position = meshMarkerPosition(tapes, point);
        if (position === null) continue;
        scene.add(mesh);
        mesh.position.copy(position);
      }
    }

    // ---- tape ------------------------------------------------------------
    const tapeMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffcb63'),
      emissive: new THREE.Color('#8a5a12'),
      emissiveIntensity: 0.85,
      roughness: 0.24,
      metalness: 0.92,
    });
    let tape: THREE.Mesh<THREE.TubeGeometry, THREE.MeshStandardMaterial> | null = null;
    let tapeProgress = 0;
    let tapeIndexCount = 0;

    function clearTape(): void {
      if (tape === null) return;
      tape.removeFromParent();
      tape.geometry.dispose();
      tape = null;
    }

    function showTape(id: MeasurementPointId | null): void {
      clearTape();
      if (id === null) return;
      const point = MEASUREMENT_POINTS.find((candidate) => candidate.id === id);
      if (point === undefined) return;

      /* The mesh answers when it can; the profile table answers before it has
         loaded, and for anything a slice cannot resolve — an arm still flush
         against the ribs has no gap for a cluster to split on. */
      const fromMesh = tapes === null ? null : meshTapeCurve(tapes, point);
      const curve = fromMesh ?? tapeCurve(point);
      const closed = fromMesh === null ? point.kind === 'GIRTH' : point.kind === 'GIRTH';

      const geometry = new THREE.TubeGeometry(curve, 240, 0.026, 12, closed);
      tape = new THREE.Mesh(geometry, tapeMaterial);
      tapeIndexCount = geometry.index?.count ?? 0;
      tapeProgress = reduced ? 1 : 0;
      geometry.setDrawRange(0, reduced ? tapeIndexCount : 0);
      /* Never into the arm group once the supplied figure is in: that group is
         hidden, and `visible: false` hides its children too — a fallback tape
         parented there is built, positioned and then never drawn. */
      if (fromMesh === null && supplied === null && isArmPoint(point) && leftArm !== undefined) {
        leftArm.add(tape);
      } else {
        scene.add(tape);
      }
    }

    // ---- post ------------------------------------------------------------
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.68, 0.86);
    composer.addPass(bloom);

    /*
     * Light and dark are two different sets, not one set with the lamps turned
     * down. On a pale ground the rim light has nothing to separate the figure
     * FROM, bloom washes out instead of glowing, and a translucent body loses
     * its edges — so the material closes up and the key does the work.
     */
    let backdrop: THREE.CanvasTexture | null = null;

    function applyTheme(): void {
      const dark = pageIsDark();
      backdrop?.dispose();
      backdrop = makeBackdrop(dark);
      scene.background = backdrop;
      renderer.toneMappingExposure = dark ? 1.15 : 1.0;
      scene.environmentIntensity = dark ? 0.4 : 0.85;
      key.intensity = dark ? 2.6 : 3.4;
      rim.intensity = dark ? 4.2 : 1.6;
      fill.intensity = dark ? 1.1 : 0.7;
      ambient.color.set(dark ? '#132a26' : '#dfeae5');
      ambient.intensity = dark ? 1.4 : 2.2;
      skin.color.set(dark ? '#12463c' : '#0b4034');
      /*
       * Nearly opaque on a light page. Transmission scales with how thick the
       * geometry is, so at 0.28 the torso held but the calves — thin, and lit
       * from behind by a pale backdrop — faded out from the knee down and the
       * figure looked like it was dissolving.
       */
      skin.transmission = dark ? 0.62 : 0.1;
      skin.roughness = dark ? 0.42 : 0.3;
      skin.attenuationColor.set(dark ? '#0a3f34' : '#093528');
      tapeMaterial.emissiveIntensity = dark ? 0.85 : 0.3;
      bloom.strength = dark ? 0.5 : 0.16;
      poolMaterial.opacity = dark ? 0.75 : 1;
    }
    applyTheme();

    const themeWatcher = new MutationObserver(applyTheme);
    themeWatcher.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', 'style'],
    });
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
    systemTheme.addEventListener('change', applyTheme);

    // ---- camera and pose --------------------------------------------------
    const view = { ...REST };
    const from = { ...REST };
    const to = { ...REST };
    let tweenStart = -1;

    function place(): void {
      const sinPolar = Math.sin(view.polar);
      camera.position.set(
        view.targetX + view.radius * sinPolar * Math.sin(view.azimuth),
        view.targetY + view.radius * Math.cos(view.polar),
        view.radius * sinPolar * Math.cos(view.azimuth),
      );
      camera.lookAt(view.targetX, view.targetY, 0);

      for (const [side, group] of armGroups) group.rotation.z = side * view.lift * DEG;
    }

    function moveTo(next: typeof REST): void {
      Object.assign(from, view);
      Object.assign(to, next);
      if (reduced) {
        Object.assign(view, next);
        tweenStart = -1;
        place();
        return;
      }
      tweenStart = performance.now();
    }

    // ---- interaction ------------------------------------------------------
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let drag: { x: number; y: number; azimuth: number; polar: number } | null = null;
    let moved = false;
    let userHasDriven = false;
    const activeRef = { current: null as MeasurementPointId | null };

    function onPointerDown(event: PointerEvent): void {
      drag = { x: event.clientX, y: event.clientY, azimuth: view.azimuth, polar: view.polar };
      moved = false;
      tweenStart = -1;
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = 'grabbing';
    }

    function onPointerMove(event: PointerEvent): void {
      if (drag === null) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        moved = true;
        userHasDriven = true;
      }
      view.azimuth = drag.azimuth - dx * 0.008;
      view.polar = Math.min(2.05, Math.max(0.75, drag.polar - dy * 0.005));
      place();
    }

    function onPointerUp(event: PointerEvent): void {
      renderer.domElement.style.cursor = 'grab';
      const wasDragging = drag !== null;
      drag = null;
      if (!wasDragging || moved) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const [hit] = raycaster.intersectObjects(pickable, false);
      if (hit === undefined) return;
      const id = (hit.object.userData as { id?: MeasurementPointId }).id;
      if (id !== undefined) selectRef.current(id);
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerUp);

    // ---- resize ------------------------------------------------------------
    function resize(): void {
      const el = hostRef.current;
      if (el === null) return;
      const { clientWidth, clientHeight } = el;
      if (clientWidth === 0 || clientHeight === 0) return;
      renderer.setSize(clientWidth, clientHeight, false);
      composer.setSize(clientWidth, clientHeight);
      bloom.resolution.set(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    place();

    // ---- loop --------------------------------------------------------------
    let frame = 0;
    let last = performance.now();

    function tick(now: number): void {
      frame = requestAnimationFrame(tick);
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (tweenStart >= 0) {
        const t = Math.min(1, (now - tweenStart) / TWEEN_MS);
        const e = easeOutExpo(t);
        view.azimuth = from.azimuth + (to.azimuth - from.azimuth) * e;
        view.polar = from.polar + (to.polar - from.polar) * e;
        view.radius = from.radius + (to.radius - from.radius) * e;
        view.targetX = from.targetX + (to.targetX - from.targetX) * e;
        view.targetY = from.targetY + (to.targetY - from.targetY) * e;
        view.lift = from.lift + (to.lift - from.lift) * e;
        if (t === 1) tweenStart = -1;
        place();
      } else if (drag === null && !userHasDriven && activeRef.current === null && !reduced) {
        // A slow drift at rest, so the figure reads as an object you can turn.
        view.azimuth -= delta * 0.12;
        place();
      }

      if (tape !== null && tapeProgress < 1) {
        tapeProgress = Math.min(1, tapeProgress + delta / 0.9);
        tape.geometry.setDrawRange(0, Math.floor(tapeIndexCount * easeOutExpo(tapeProgress)));
      }

      composer.render();
    }
    frame = requestAnimationFrame(tick);

    // ---- imperative surface for React --------------------------------------
    apiRef.current = {
      focus(id) {
        activeRef.current = id;
        showTape(id);
        if (id === null) {
          moveTo(REST);
          return;
        }
        const point = MEASUREMENT_POINTS.find((candidate) => candidate.id === id);
        if (point === undefined) return;
        /* From the mesh when it has been read — the supplied figure holds its
           arms at a different angle from the procedural one, so a target derived
           from the old pose pointed the camera at empty air. */
        const marker =
          (tapes === null ? null : meshMarkerPosition(tapes, point)) ??
          (isArmPoint(point) ? armMarkerWorld(point, point.armLift, -1) : markerPosition(point));
        moveTo({
          azimuth: point.spin * DEG,
          polar: 1.5,
          radius: isArmPoint(point) ? ARM_RADIUS : CLOSE_RADIUS,
          targetX: marker.x,
          targetY: marker.y,
          lift: point.armLift,
        });
      },
      mark(filled, active) {
        for (const [id, mesh] of markers) {
          const isActive = id === active;
          const isFilled = filled.has(id);
          mesh.material.color.set(isActive ? '#ffcb63' : isFilled ? '#3fd6b0' : '#54635f');
          mesh.material.emissive.set(isActive ? '#8a5a12' : isFilled ? '#0d3b30' : '#000000');
          /*
           * The others shrink back once one is chosen. Thirteen equal dots at
           * rest is a menu; thirteen equal dots while the camera is in close on
           * a rib cage is a rash — they read as studs pressed into the body.
           */
          mesh.scale.setScalar(isActive ? 1.9 : active === null ? 1 : 0.5);
        }
      },
    };

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      themeWatcher.disconnect();
      systemTheme.removeEventListener('change', applyTheme);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      apiRef.current = null;
      clearTape();
      if (supplied !== null) {
        supplied.traverse((child) => {
          if (child instanceof THREE.Mesh) child.geometry.dispose();
        });
        scene.remove(supplied);
      }
      markerGeometry.dispose();
      shoulderGeometry.dispose();
      footGeometry.dispose();
      for (const geometries of armGeometries.values()) {
        for (const geometry of geometries) geometry.dispose();
      }
      for (const mesh of markers.values()) mesh.material.dispose();
      for (const geometry of bodyGeometries) geometry.dispose();
      skin.dispose();
      tapeMaterial.dispose();
      pool.geometry.dispose();
      poolMaterial.dispose();
      backdrop?.dispose();
      composer.dispose();
      pmrem.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    apiRef.current?.focus(activePointId);
  }, [activePointId]);

  useEffect(() => {
    apiRef.current?.mark(filledIds, activePointId);
  }, [filledIds, activePointId]);

  return <div ref={hostRef} className="size-full" />;
}
