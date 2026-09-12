/**
 * ADR 16 — measurements are stored as integer millimetres.
 *
 * Unit is an entry and display concern, not a fact about a body: 40 in and
 * 101.6 cm are the same chest and must produce the same record. That record is
 * made in ONE place, by one order of operations (`conversion.ts`), and in the
 * browser nothing is ever rounded into millimetres and back.
 *
 * What the customer TYPED is kept as they typed it. A unit switch shows a
 * converted figure but converts from the original every time, so a tailor's
 * 8.25 survives any number of switches instead of drifting a little on each.
 *
 * A pure module — no React, no fetching (PD-02).
 */

import { assertNever } from '@/lib/result';

export const UNITS = ['IN', 'CM'] as const;
export type Unit = (typeof UNITS)[number];

export const MM_PER_UNIT: Readonly<Record<Unit, number>> = { IN: 25.4, CM: 10 };

/**
 * Inches by default, because that is what tailors in this market work in
 * (configuration 39). Centimetres are offered, never assumed.
 */
export const DEFAULT_UNIT: Unit = 'IN';

/** Decimals a figure is shown to: tailors write quarter inches, and 0.1 cm is a millimetre. */
export const DECIMALS: Readonly<Record<Unit, number>> = { IN: 2, CM: 1 };

/**
 * A unit's short name, from the studio's copy. One place, so a third unit cannot
 * be added and missed in one of the places that prints a suffix.
 */
export function unitSuffix(
  unit: Unit,
  copy: { readonly unitShortInches: string; readonly unitShortCentimetres: string },
): string {
  switch (unit) {
    case 'IN':
      return copy.unitShortInches;
    case 'CM':
      return copy.unitShortCentimetres;
    default:
      return assertNever(unit);
  }
}

/*
 * A typed figure is plain decimal digits, at most four before the point and two
 * after — what a tape gives (A2-2). `Number()` alone accepts "0x14", "2e1" and
 * "+.5", which nobody types and the server refuses.
 */
const TYPED_FIGURE = /^\d{1,4}(?:\.\d{1,2})?$/;

/* A card writes 19½, 19 1/2 or 19-1/2; the contract reads 19.5. */
const FRACTION_DECIMALS: Readonly<Record<string, string>> = {
  '½': '5',
  '1/2': '5',
  '¼': '25',
  '1/4': '25',
  '¾': '75',
  '3/4': '75',
};
const WRITTEN_FRACTION = /(\d*)\s*-?\s*(½|¼|¾|1\/2|1\/4|3\/4)(?!\d)/g;

/**
 * An Urdu keyboard's digits — ۰ to ۹, and the Arabic ٠ to ٩ — its decimal
 * separator ٫, and the fractions a tailor's card writes, read as the same
 * figures. Applied to what is SENT as well as to what is judged, so the server
 * only ever sees ASCII decimals.
 */
export function normaliseDigits(raw: string): string {
  return raw
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/٫/g, '.')
    .replace(
      WRITTEN_FRACTION,
      (_written: string, whole: string, fraction: string) =>
        `${whole === '' ? '0' : whole}.${FRACTION_DECIMALS[fraction] ?? ''}`,
    );
}

/** A typed figure, or null for a blank field or anything that is not one. */
export function parseEntry(raw: string): number | null {
  const figure = normaliseDigits(raw).trim();
  return TYPED_FIGURE.test(figure) ? Number(figure) : null;
}

/** A figure as a field shows it: to the unit's decimals, trailing zeros dropped. */
export function formatFigure(value: number, unit: Unit): string {
  const factor = 10 ** DECIMALS[unit];
  return String(Math.round(value * factor) / factor);
}

/** What the customer typed into a field, and the unit they typed it in. */
export interface TypedEntry {
  readonly raw: string;
  readonly unit: Unit;
}

/**
 * A typed entry shown in `target`: the string itself in its own unit, otherwise
 * converted from it — never from an earlier conversion.
 */
export function showEntry(entry: TypedEntry, target: Unit): string {
  if (entry.unit === target) return entry.raw;
  const value = parseEntry(entry.raw);
  if (value === null) return '';
  return formatFigure((value * MM_PER_UNIT[entry.unit]) / MM_PER_UNIT[target], target);
}

/**
 * What was last TYPED into a field, given what is in it now. If it still holds
 * exactly what the last unit switch put there, the earlier typing stands;
 * anything else is new typing, in the unit on screen.
 */
export function reconcileEntry(
  previous: TypedEntry | undefined,
  lastShown: string | undefined,
  current: string,
  unit: Unit,
): TypedEntry {
  if (previous !== undefined && lastShown !== undefined && current === lastShown) return previous;
  return { raw: current, unit };
}
