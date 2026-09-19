import type { Locale } from '@/i18n/locales';

import { SIZE_LABELS } from './product-content-db';

/**
 * D1 — §28.1's Size Set vocabulary, standing in for Catalogue (§12 `getSizeSet`).
 *
 * §6.1 gives every sized piece a `size_set_id`, and a size set OWNS its sizes: a
 * size id names one size of one set, never a label that two charts happen to
 * share. That is what lets a saved size (§28.3) be matched to a piece by its size
 * id alone — the product projection does not need to carry the set's id for a
 * piece to know whether a saved size is one of its own.
 *
 * The fixture has ONE set, because every stitched garment in `CATALOGUE` is cut
 * to the same XS–XL chart. A real catalogue has several (a kameez chart, a
 * trouser waist chart), and nothing below assumes there is only one.
 *
 * The product page reads its sizes from here (`product-detail-db.ts`), so the
 * sizes a customer chooses and the sizes a saved size can name cannot disagree
 * (PD-01).
 */

export interface SizeSetSize {
  readonly id: string;
  readonly label: Record<Locale, string>;
}

export interface SizeSetRecord {
  readonly id: string;
  /** The chart's customer-facing name, per locale (§28.1: with Urdu transliterations). */
  readonly name: Record<Locale, string>;
  /** In the order a selector draws them. */
  readonly sizes: readonly SizeSetSize[];
}

/** Deterministic, RFC-4122-shaped ids, in the shape the product fixture has always served. */
const sizeId = (position: number): string =>
  `a1b2c3d4-2222-4c8a-8f21-${String(position).padStart(12, '0')}`;

export const STANDARD_SIZE_SET: SizeSetRecord = {
  id: 'a1b2c3d4-5555-4c8a-8f21-000000000001',
  name: { en: 'Clothing sizes', ur: 'کپڑوں کے سائز' },
  sizes: SIZE_LABELS.en.map((label, index) => ({
    id: sizeId(index + 1),
    label: { en: label, ur: SIZE_LABELS.ur[index] ?? label },
  })),
};

/** Every size set the catalogue holds, in the order an account lists them. */
export const SIZE_SETS: readonly SizeSetRecord[] = [STANDARD_SIZE_SET];

/** One set's sizes as the product projection serves them, in one language. */
export function sizeOptionsOf(set: SizeSetRecord, locale: Locale): { id: string; label: string }[] {
  return set.sizes.map((size) => ({ id: size.id, label: size.label[locale] }));
}

/**
 * The set a size belongs to, and the size itself — or `null` for an id that is
 * not a size of any set. The one size of a sizeless piece (`ONE_SIZE`) is such an
 * id: §6.1 makes that piece's `size_set_id` null, so there is no chart to save.
 */
export function sizeSetOfSize(
  id: string,
): { readonly set: SizeSetRecord; readonly size: SizeSetSize } | null {
  for (const set of SIZE_SETS) {
    const size = set.sizes.find((entry) => entry.id === id);
    if (size !== undefined) return { set, size };
  }
  return null;
}
