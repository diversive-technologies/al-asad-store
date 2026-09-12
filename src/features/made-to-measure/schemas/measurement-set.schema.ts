import { z } from 'zod';

import {
  garmentStyleIdSchema,
  measurementPieceIdSchema,
  measurementPointIdSchema,
  optionGroupIdSchema,
  optionValueIdSchema,
} from '@/lib/domain/ids';

import { DRAWING_IDS } from '../lib/garment-drawings';

/**
 * §34.5 as proposed in Amendment 2 (A2-3, A2-7) — THE measurement list, as the
 * backend serves it for one garment style, with the finishing choices that
 * decide which of its points are asked. Not yet in the architecture document;
 * this is the contract the frontend is built against until the operator accepts
 * it.
 *
 * Each point carries three independent facts: `kind` decides only the drawn shape
 * (a GIRTH is a ring, a LENGTH or WIDTH a span); `enteredAs` decides the
 * arithmetic (a HALF figure is doubled); `basis` says what the number describes.
 * There is NO anchor: a mark's position is derived from its shape by one rule
 * (`anchorOf`), so a row can never put its button somewhere other than its drawn
 * mark.
 *
 * DATA-02: every rule below that a component would otherwise have to trust is
 * checked here, at the boundary, so a malformed list is a handled contract
 * violation rather than a form that asks the wrong questions.
 */

/**
 * How the figures are taken (§34.5 `source`, A2-10): copied off a garment the
 * customer owns, or off a tailor's card. Each path is its own list, with its own
 * point ids and conventions — a card writes the teera as HALF the shoulder.
 */
export const CAPTURE_SOURCES = ['GARMENT_COPY', 'TAILOR_CARD'] as const;
export const captureSourceSchema = z.enum(CAPTURE_SOURCES);

const coordinate = z.number().finite();

const ringSchema = z.object({
  shape: z.literal('RING'),
  cx: coordinate,
  cy: coordinate,
  rx: z.number().positive(),
  ry: z.number().positive(),
  /** A cuff is not horizontal, so nor is the ring that wraps it. */
  rotate: z.number().finite().optional(),
});

const spanSchema = z.object({
  shape: z.literal('SPAN'),
  x1: coordinate,
  y1: coordinate,
  x2: coordinate,
  y2: coordinate,
});

/** Where the tape goes, in the drawing's own viewBox. */
export const geometrySchema = z.discriminatedUnion('shape', [ringSchema, spanSchema]);

/**
 * True while that choice is in play AND holds one of these values. Nested choices
 * are conditions on conditions: a ban's width applies only while the neck is a
 * ban, and a cuff is measured only while the sleeve has one.
 */
export const optionConditionSchema = z.object({
  group: optionGroupIdSchema,
  values: z.tuple([optionValueIdSchema], optionValueIdSchema),
});

export const optionValueSchema = z.object({
  id: optionValueIdSchema,
  /**
   * How the drawing shows this value — a name the storefront's drawings may
   * know. One they do not know draws the garment's default, never a garment with
   * a part missing (§34.6), so an unknown name is not a contract violation.
   */
  drawingVariant: z.string().min(1).max(64).nullable(),
});

/** §34.5 `options[]`, as A2-7 proposes it: one finishing choice on one garment. */
export const optionGroupSchema = z.object({
  id: optionGroupIdSchema,
  pieceId: measurementPieceIdSchema,
  defaultValue: optionValueIdSchema,
  /** Null for a choice always offered; otherwise the choice it depends on. */
  appliesWhen: optionConditionSchema.nullable(),
  // At least two: a choice of one is not a choice.
  values: z.tuple([optionValueSchema, optionValueSchema], optionValueSchema),
});

export const measurementPointSchema = z.object({
  id: measurementPointIdSchema,
  pieceId: measurementPieceIdSchema,
  kind: z.enum(['GIRTH', 'LENGTH', 'WIDTH']),
  enteredAs: z.enum(['HALF', 'FULL']),
  basis: z.enum(['GARMENT', 'BODY']),
  /** A protected tailoring term (A2-14), or null. */
  termKey: z.string().min(1).nullable(),
  required: z.boolean(),
  /** Bounds on the STORED figure — the circumference, for a girth. */
  minMm: z.number().int().positive(),
  maxMm: z.number().int().positive(),
  /** Null where the drawing cannot show the measurement truthfully (§34.6). */
  geometry: geometrySchema.nullable(),
  /** Null for a point always asked; otherwise the choice that brings it into play. */
  askedWhen: optionConditionSchema.nullable(),
});

export const setPieceSchema = z.object({
  id: measurementPieceIdSchema,
  drawingId: z.enum(DRAWING_IDS),
});

const measurementSetShape = z.object({
  garmentStyle: garmentStyleIdSchema,
  /** The path this list is for; with the style and version, the list's identity. */
  source: captureSourceSchema,
  /** Every path the style offers, first the one a bare address opens (A2-7). */
  sources: z.tuple([captureSourceSchema], captureSourceSchema),
  version: z.number().int().positive(),
  /* Tuples with a rest element rather than `.nonempty()`: both refuse an empty
     list, but only the tuple TYPES the first entry as present, which is what
     lets the studio always have a garment to show without a dead branch. */
  pieces: z.tuple([setPieceSchema], setPieceSchema),
  /** Ordered: the order is the form's order (§34.5). */
  points: z.tuple([measurementPointSchema], measurementPointSchema),
  /** Ordered too: a choice is shown, and settled, before any that depends on it. */
  options: z.array(optionGroupSchema).max(32),
});

type ShapedSet = z.infer<typeof measurementSetShape>;
type OptionConditionShape = z.infer<typeof optionConditionSchema>;
type OptionGroupShape = z.infer<typeof optionGroupSchema>;
type Issue = (message: string, path: (string | number)[]) => void;

/* A condition names a choice declared BEFORE it, with values that choice has — so
   settling choices in order never meets one it has not settled yet, and a cycle
   cannot be written. */
function checkCondition(
  condition: OptionConditionShape | null,
  earlier: readonly OptionGroupShape[],
  path: (string | number)[],
  issue: Issue,
): void {
  if (condition === null) return;
  const group = earlier.find((candidate) => candidate.id === condition.group);
  if (group === undefined) {
    issue('A condition names a choice not declared before it.', path);
    return;
  }
  const known = new Set(group.values.map((value) => value.id));
  if (condition.values.some((value) => !known.has(value))) {
    issue('A condition names a value its choice does not have.', path);
  }
}

function checkOptions(set: ShapedSet, issue: Issue): void {
  const pieceIds = new Set(set.pieces.map((piece) => piece.id));

  set.options.forEach((group, index) => {
    const path = ['options', index];
    if (set.options.findIndex((other) => other.id === group.id) !== index) {
      issue('A choice is declared twice.', path);
    }
    if (!pieceIds.has(group.pieceId)) {
      issue('A choice names a piece the set does not declare.', [...path, 'pieceId']);
    }
    const values = group.values.map((value) => value.id);
    if (new Set(values).size !== values.length) issue('A choice has a value twice.', path);
    if (!values.includes(group.defaultValue)) {
      issue('A choice defaults to a value it does not have.', [...path, 'defaultValue']);
    }
    checkCondition(group.appliesWhen, set.options.slice(0, index), [...path, 'appliesWhen'], issue);
  });

  set.points.forEach((point, index) => {
    checkCondition(point.askedWhen, set.options, ['points', index, 'askedWhen'], issue);
  });
}

function checkPoints(set: ShapedSet, issue: Issue): void {
  const pieceIds = set.pieces.map((piece) => piece.id);
  let furthestPiece = 0;

  set.points.forEach((point, index) => {
    const at = pieceIds.indexOf(point.pieceId);
    if (at === -1) {
      issue('A point names a piece the set does not declare.', ['points', index, 'pieceId']);
      return;
    }
    // Each piece's points together, in the order the pieces are declared —
    // otherwise the tabs, the fieldsets and the stepper would disagree.
    if (at < furthestPiece) {
      issue('A piece must not resume after another has begun.', ['points', index, 'pieceId']);
    }
    furthestPiece = Math.max(furthestPiece, at);

    if (point.minMm >= point.maxMm) issue('The minimum must be below the maximum.', ['points', index]);
    /* A girth is halved across the flat garment, and a card halves a WIDTH — the
       teera, half the shoulder. A length is never written as a half. */
    if (point.enteredAs === 'HALF' && point.kind === 'LENGTH') {
      issue('A length is never written as a half.', ['points', index, 'enteredAs']);
    }
    if (point.geometry !== null && (point.geometry.shape === 'RING') !== (point.kind === 'GIRTH')) {
      issue('A girth is drawn as a ring, a length or width as a span.', ['points', index]);
    }
  });
}

export const measurementSetSchema = measurementSetShape.superRefine((set, context) => {
  const issue: Issue = (message, path) => {
    context.addIssue({ code: 'custom', message, path });
  };

  const pieceIds = set.pieces.map((piece) => piece.id);
  if (new Set(pieceIds).size !== pieceIds.length) issue('A piece is declared twice.', ['pieces']);

  const pointIds = set.points.map((point) => point.id);
  if (new Set(pointIds).size !== pointIds.length) issue('A point is declared twice.', ['points']);

  if (new Set(set.sources).size !== set.sources.length) issue('A path is offered twice.', ['sources']);
  if (!set.sources.includes(set.source)) issue('The list served is not a path offered.', ['source']);

  checkPoints(set, issue);
  checkOptions(set, issue);

  // A garment with nothing to measure would draw a tab, an unmarked drawing and
  // an empty fieldset.
  set.pieces.forEach((piece, index) => {
    if (!set.points.some((point) => point.pieceId === piece.id)) {
      issue('A piece is declared with nothing to measure on it.', ['pieces', index]);
    }
  });
});

export type CaptureSource = z.infer<typeof captureSourceSchema>;
export type Geometry = z.infer<typeof geometrySchema>;
export type OptionCondition = z.infer<typeof optionConditionSchema>;
export type OptionValue = z.infer<typeof optionValueSchema>;
export type OptionGroup = z.infer<typeof optionGroupSchema>;
export type MeasurementPoint = z.infer<typeof measurementPointSchema>;
export type SetPiece = z.infer<typeof setPieceSchema>;
export type MeasurementSet = z.infer<typeof measurementSetSchema>;
export type MeasurementKind = MeasurementPoint['kind'];
export type EnteredAs = MeasurementPoint['enteredAs'];
