/**
 * A unit switch across EVERY figure the form holds — not only the list on screen.
 *
 * A style switch keeps figures for points the new list does not show. Converting
 * only the visible ones left those in the old unit, to be read in the new one
 * when their list came back: a 20 in waistcoat chest returned as "20" beside
 * "cm", counted as nothing, and a second switch then rewrote it for good.
 *
 * Every field converts FROM what was last typed in it, so going back to the
 * original unit restores the exact string, and typing in the new unit becomes the
 * new original. A point on screen is never shown a figure it would refuse
 * (`showAccepted`); a kept one converts plainly.
 *
 * MOD-04 — pure: the hook keeps the result, this decides it.
 */

import type { MeasurementPoint } from '../schemas/measurement-set.schema';
import type { TypedPointEntry } from '../schemas/profile.schema';
import { showAccepted } from './conversion';
import { normaliseDigits, reconcileEntry, showEntry, type TypedEntry, type Unit } from './units';

export interface HeldEntries {
  /** What was last typed in each field, and in which unit. */
  readonly typed: Readonly<Record<string, TypedEntry>>;
  /** What the last switch put in each field, to tell it apart from new typing. */
  readonly shown: Readonly<Record<string, string>>;
}

export const NOTHING_HELD: HeldEntries = { typed: {}, shown: {} };

export interface SwitchedUnit {
  readonly held: HeldEntries;
  /** The value to put in each field, by field name. */
  readonly display: Readonly<Record<string, string>>;
}

export function switchUnit(
  points: readonly MeasurementPoint[],
  values: Readonly<Record<string, string | undefined>>,
  held: HeldEntries,
  from: Unit,
  to: Unit,
): SwitchedUnit {
  const typed: Record<string, TypedEntry> = { ...held.typed };
  const shown: Record<string, string> = { ...held.shown };
  const display: Record<string, string> = {};

  for (const id of new Set([...Object.keys(values), ...Object.keys(held.typed)])) {
    const entry = reconcileEntry(held.typed[id], held.shown[id], values[id] ?? '', from);
    const point = points.find((candidate) => candidate.id === id);
    const next = point === undefined ? showEntry(entry, to) : showAccepted(point, entry, to);
    typed[id] = entry;
    shown[id] = next;
    display[id] = next;
  }

  return { held: { typed, shown }, display };
}

/**
 * What to SEND for the list on screen: each figure as it was last typed, in the
 * unit it was typed in — never the converted figure a switch put in the field.
 * So 19.5 typed in inches is sent as 19.5 in whichever unit is showing, and the
 * server records the same millimetres either way (A2-2). Empty fields are not
 * sent, and figures kept from another style never are. An Urdu keyboard's digits
 * are sent as the ASCII ones the contract reads.
 */
export function typedEntriesOf(
  points: readonly MeasurementPoint[],
  values: Readonly<Record<string, string | undefined>>,
  held: HeldEntries,
  unit: Unit,
): readonly TypedPointEntry[] {
  return points.flatMap((point) => {
    const entry = reconcileEntry(
      held.typed[point.id],
      held.shown[point.id],
      values[point.id] ?? '',
      unit,
    );
    const raw = normaliseDigits(entry.raw).trim();
    return raw === '' ? [] : [{ pointId: point.id, raw, unit: entry.unit }];
  });
}
