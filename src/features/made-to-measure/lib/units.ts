/**
 * ADR 16 — measurements are stored as integer millimetres.
 *
 * Unit is an entry and display concern, not a fact about a body: 40 in and
 * 101.6 cm are the same chest and must produce the same record. Keeping the
 * store in one integral unit is also what stops a value drifting as it is
 * converted back and forth across an order's life.
 *
 * A pure module — no React, no fetching (PD-02).
 */

export const UNITS = ['IN', 'CM'] as const;
export type Unit = (typeof UNITS)[number];

const MM_PER_UNIT: Readonly<Record<Unit, number>> = { IN: 25.4, CM: 10 };

/**
 * Inches by default, because that is what tailors in this market work in
 * (configuration 39). Centimetres are offered, never assumed.
 */
export const DEFAULT_UNIT: Unit = 'IN';

/** How many decimals the unit is worth showing. A tape reads to an eighth. */
const DECIMALS: Readonly<Record<Unit, number>> = { IN: 1, CM: 0 };

export function fromMm(millimetres: number, unit: Unit): number {
  const value = millimetres / MM_PER_UNIT[unit];
  const factor = 10 ** DECIMALS[unit];
  return Math.round(value * factor) / factor;
}

export function toMm(value: number, unit: Unit): number {
  return Math.round(value * MM_PER_UNIT[unit]);
}

/**
 * Converting a whole entered form when the customer flips the unit toggle.
 *
 * Round-tripping through millimetres rather than scaling the displayed number is
 * deliberate: the record is the millimetres, so the toggle must show what is
 * actually stored rather than a prettier number that disagrees with it.
 */
export function convertEntry(value: string, from: Unit, to: Unit): string {
  if (value.trim() === '') return '';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '';
  return String(fromMm(toMm(parsed, from), to));
}
