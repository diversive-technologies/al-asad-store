/**
 * What a customer has already saved, matched against the list in front of them.
 *
 * MOD-04 — pure. It decides what CAN be offered; nothing here fills a field, and
 * nothing here is applied without the customer saying so. Cloth gets cut from
 * these figures, so a measurement never arrives in a form unannounced.
 *
 * Reuse across garment styles is a LOOKUP rather than a mapping, and that is a
 * fact of the served lists rather than a convenience taken here: every style is
 * composed from the same point rows, so `kameezChest` in a waistcoat suit IS
 * `kameezChest` in a kameez shalwar — the same bounds, the same half-or-whole
 * convention, the same basis. Someone who has measured a kameez shalwar has
 * therefore already given eleven of a waistcoat suit's fourteen measurements.
 * The tailor's-card lists are the exception: their points carry their own ids,
 * so a card figure matches a card list and never a garment one.
 */

import type {
  GarmentStyleId,
  MeasurementPointId,
  OptionGroupId,
  OptionValueId,
} from '@/lib/domain/ids';

import type { MeasurementPoint } from '../schemas/measurement-set.schema';
import type {
  MeasurementProfile,
  MeasurementProfiles,
  Preference,
} from '../schemas/profile.schema';
import { acceptsEntry, showAccepted } from './conversion';
import type { Unit } from './units';

/** One figure a saved profile can put back into the form, as it was typed. */
export interface SavedFigure {
  readonly pointId: MeasurementPointId;
  readonly raw: string;
  readonly unit: Unit;
  /** The style it was saved under — this one, or another that asks the same point. */
  readonly fromStyle: GarmentStyleId;
}

/** A saved figure this list cannot take, and the reason a customer can act on. */
export interface SetAside {
  readonly pointId: MeasurementPointId;
  readonly reason: 'OUT_OF_RANGE';
}

export interface SavedOffer {
  /** The profile the offer is named after: this style's, where there is one. */
  readonly lead: MeasurementProfile;
  /** True when a figure comes from a profile saved under a different style. */
  readonly borrowed: boolean;
  readonly figures: readonly SavedFigure[];
  readonly setAside: readonly SetAside[];
}

/**
 * Only what a saved choice has to be checked against: the group's id and the
 * values it still has. Stated here rather than taken from the served contract,
 * because that type's values are a mutable tuple and the studio's are readonly —
 * and because this is genuinely all a lookup needs (MOD-04).
 */
export interface OfferedChoiceGroup {
  readonly id: OptionGroupId;
  readonly values: readonly { readonly id: OptionValueId }[];
}

/** The list this is matched against — the SERVED points, not the asked ones. */
export interface SavedAgainst {
  readonly garmentStyle: GarmentStyleId;
  readonly points: readonly MeasurementPoint[];
  readonly options: readonly OfferedChoiceGroup[];
}

/*
 * This style's own profile leads, then the most recently saved. Order decides
 * which profile answers for a point two of them hold, and the customer's own
 * latest word about a measurement is the one to take.
 */
function byRelevance(garmentStyle: GarmentStyleId) {
  return (left: MeasurementProfile, right: MeasurementProfile): number => {
    const own =
      Number(right.garmentStyle === garmentStyle) - Number(left.garmentStyle === garmentStyle);
    return own !== 0 ? own : right.createdAt.localeCompare(left.createdAt);
  };
}

/**
 * Everything the saved profiles can put into this list, or null when they hold
 * nothing it asks for.
 *
 * A figure whose point is not on this list is simply not offered: it belongs to a
 * garment the customer is not measuring, which is not a problem to report. A
 * figure the point no longer ACCEPTS is set aside and named, because the customer
 * would otherwise be left wondering why one field stayed empty.
 */
export function savedOffer(list: SavedAgainst, profiles: MeasurementProfiles): SavedOffer | null {
  const ordered = [...profiles].sort(byRelevance(list.garmentStyle));
  const answered = new Set<MeasurementPointId>();
  const figures: SavedFigure[] = [];
  const setAside: SetAside[] = [];
  let lead: MeasurementProfile | null = null;

  for (const profile of ordered) {
    for (const value of profile.values) {
      const point = list.points.find((candidate) => candidate.id === value.pointId);
      if (point === undefined || answered.has(value.pointId)) continue;
      answered.add(value.pointId);
      lead ??= profile;
      if (!acceptsEntry(point, value.enteredValue, value.unitEntered)) {
        setAside.push({ pointId: value.pointId, reason: 'OUT_OF_RANGE' });
        continue;
      }
      figures.push({
        pointId: value.pointId,
        raw: value.enteredValue,
        unit: value.unitEntered,
        fromStyle: profile.garmentStyle,
      });
    }
  }

  if (lead === null) return null;
  return {
    lead,
    borrowed: figures.some((figure) => figure.fromStyle !== list.garmentStyle),
    figures,
    setAside,
  };
}

/**
 * The finishing choices to restore with the figures, kept to what this list still
 * offers. A choice the list has dropped, or a value it no longer has, is left at
 * the list's own default — the choices are on screen, so nothing is hidden by it.
 */
export function savedChoices(
  options: readonly OfferedChoiceGroup[],
  profile: MeasurementProfile,
): readonly Preference[] {
  return profile.preferences.filter((preference) => {
    const group = options.find((candidate) => candidate.id === preference.group);
    return group !== undefined && group.values.some((value) => value.id === preference.value);
  });
}

/**
 * A saved figure in the unit the form is SHOWING.
 *
 * The record keeps what was typed and the unit it was typed in, so a figure
 * saved in centimetres has to be shown in inches when that is what the form is
 * set to. `showAccepted` is what does it, and it is the same function the unit
 * toggle uses — so a figure sitting exactly on a limit comes back at that limit
 * rather than a rounding step outside it, and is not refused the moment it lands.
 */
export function figureShownIn(figure: SavedFigure, point: MeasurementPoint, unit: Unit): string {
  return showAccepted(point, { raw: figure.raw, unit: figure.unit }, unit);
}
