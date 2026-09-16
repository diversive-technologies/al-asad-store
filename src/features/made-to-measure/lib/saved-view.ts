/**
 * A saved profile, read back through the same rows the review shows before a save.
 *
 * MOD-04 — pure. The record keeps what was TYPED beside what was RECORDED, which
 * is exactly what a passed check leaves behind — so a saved profile can be shown
 * with the review's own groups, arithmetic and wording rather than a second
 * implementation of "as typed / as kept" that could drift from it (PD-01).
 */

import type { MeasurementProfile } from '../schemas/profile.schema';
import { reviewGroups, type CheckedMeasurements, type ReviewGroup } from './review';
import type { StudioSet } from './studio-set';

/** A saved profile in the shape the review speaks. */
export function checkedFromProfile(profile: MeasurementProfile): CheckedMeasurements {
  return {
    entries: profile.values.map((value) => ({
      pointId: value.pointId,
      raw: value.enteredValue,
      unit: value.unitEntered,
    })),
    preferences: profile.preferences,
    recorded: new Map(profile.values.map((value) => [value.pointId, value.valueMm])),
    /* What the SERVER counted as kept when it accepted the save, so a figure the
       customer was asked about and stood by is still marked as one. */
    acknowledged: profile.acknowledgedFindings,
  };
}

/** Garment by garment, in the served order, as the review groups them. */
export function savedGroups(
  studio: StudioSet,
  profile: MeasurementProfile,
): readonly ReviewGroup[] {
  return reviewGroups(studio, checkedFromProfile(profile));
}

/**
 * How many figures on file the list no longer asks for.
 *
 * `reviewGroups` walks the LIST rather than the record, so a point the guide has
 * since dropped simply does not appear — which would quietly show a customer
 * fewer measurements than they gave us. The count is not a defect to fix on this
 * page; it is a fact the page has to admit to rather than swallow.
 */
export function figuresNotAsked(studio: StudioSet, profile: MeasurementProfile): number {
  return profile.values.filter(
    (value) => !studio.points.some((point) => point.id === value.pointId),
  ).length;
}
