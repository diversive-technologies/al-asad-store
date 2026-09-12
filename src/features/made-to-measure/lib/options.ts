/**
 * Finishing choices — which are in play, what they ask for, and how the drawing
 * shows them (§34.5 `options[]`, A2-7).
 *
 * One rule decides which points are ASKED (`askedStudio`), and everything that
 * counts or walks the form reads the list it returns: the stepper, the progress
 * count, the form's schema, the error summary, the submission, the drawing's
 * marks and the review. A figure kept on a point that is no longer asked stays in
 * the form and is converted with every other, but it is neither judged, stepped
 * to nor sent.
 *
 * MOD-04 — pure.
 */

import type { MeasurementPieceId, OptionGroupId, OptionValueId } from '@/lib/domain/ids';

import type { OptionCondition } from '../schemas/measurement-set.schema';
import type { Preference } from '../schemas/profile.schema';
import type { StudioOptionGroup, StudioOptionValue, StudioSet } from './studio-set';

/** What the customer has picked, by choice. A pick for a choice not in play is kept, unused. */
export type Picks = ReadonlyMap<OptionGroupId, OptionValueId>;

export interface ChoiceInPlay {
  readonly group: StudioOptionGroup;
  readonly value: StudioOptionValue;
}

type Settled = ReadonlyMap<OptionGroupId, OptionValueId>;

function holds(condition: OptionCondition | null, settled: Settled): boolean {
  if (condition === null) return true;
  const value = settled.get(condition.group);
  return value !== undefined && condition.values.includes(value);
}

const settledOf = (inPlay: readonly ChoiceInPlay[]): Settled =>
  new Map(inPlay.map((choice) => [choice.group.id, choice.value.id]));

/**
 * The choices in play, in the served order, each with its value: the customer's
 * pick where it is one of the choice's values, its default otherwise. A choice
 * whose condition does not hold is not in play — a ban's width with a collar.
 * The contract puts every choice after the one it depends on, so one pass settles
 * them all.
 */
export function choicesInPlay(
  groups: readonly StudioOptionGroup[],
  picks: Picks,
): readonly ChoiceInPlay[] {
  const settled = new Map<OptionGroupId, OptionValueId>();
  const inPlay: ChoiceInPlay[] = [];
  for (const group of groups) {
    if (!holds(group.appliesWhen, settled)) continue;
    const value =
      group.values.find((candidate) => candidate.id === picks.get(group.id)) ??
      group.values.find((candidate) => candidate.id === group.defaultValue) ??
      group.values[0];
    settled.set(group.id, value.id);
    inPlay.push({ group, value });
  }
  return inPlay;
}

/**
 * The studio as the choices leave it: only the points asked, and only the
 * garments that still have one — a garment with nothing asked is hidden, not
 * drawn empty. Never without a garment: a list whose choices would hide every
 * one keeps its pieces rather than showing nothing.
 */
export function askedStudio(studio: StudioSet, inPlay: readonly ChoiceInPlay[]): StudioSet {
  const settled = settledOf(inPlay);
  const points = studio.points.filter((point) => holds(point.askedWhen, settled));
  const [first, ...rest] = studio.pieces.filter((piece) =>
    points.some((point) => point.pieceId === piece.id),
  );
  return { ...studio, points, pieces: first === undefined ? studio.pieces : [first, ...rest] };
}

/** What is sent: every choice in play, defaults included (A2-8 `preferences`). */
export function preferencesOf(inPlay: readonly ChoiceInPlay[]): readonly Preference[] {
  return inPlay.map((choice) => ({ group: choice.group.id, value: choice.value.id }));
}

/** The drawing variants the choices on one garment name — see `detailOf`. */
export function drawingVariants(
  inPlay: readonly ChoiceInPlay[],
  pieceId: MeasurementPieceId,
): ReadonlySet<string> {
  return new Set(
    inPlay.flatMap(({ group, value }) =>
      group.pieceId === pieceId && value.drawingVariant !== null ? [value.drawingVariant] : [],
    ),
  );
}

type Conditional = { readonly askedWhen: OptionCondition | null };
type Dependent = { readonly id: OptionGroupId; readonly appliesWhen: OptionCondition | null };

/* Every choice a point's asking depends on, with the values each must hold — its
   own condition, then the condition that condition's choice applies under, up to
   a choice always offered. The contract puts each choice after its parent, so the
   walk ends. */
function requirementsOf(
  point: Conditional,
  groups: readonly Dependent[],
): ReadonlyMap<OptionGroupId, readonly OptionValueId[]> {
  const required = new Map<OptionGroupId, readonly OptionValueId[]>();
  let condition = point.askedWhen;
  while (condition !== null && !required.has(condition.group)) {
    required.set(condition.group, condition.values);
    const group = condition.group;
    condition = groups.find((candidate) => candidate.id === group)?.appliesWhen ?? null;
  }
  return required;
}

/**
 * Whether two points can never be asked together — a cuff and a plain sleeve's
 * opening, or a double cuff's depth and the same opening, whose conditions only
 * clash one choice further up. A choice holds one value, so two points whose
 * requirements need disjoint values of one choice are never both asked. Such a
 * pair may share a place on the drawing, since only one is ever marked on it.
 */
export function neverTogether(
  a: Conditional,
  b: Conditional,
  groups: readonly Dependent[],
): boolean {
  const first = requirementsOf(a, groups);
  const second = requirementsOf(b, groups);
  return [...first].some(([group, values]) => {
    const others = second.get(group);
    return others !== undefined && !values.some((value) => others.includes(value));
  });
}
