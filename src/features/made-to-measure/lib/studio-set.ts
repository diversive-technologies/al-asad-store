/**
 * The measurement list and its wording, joined into what the studio renders.
 *
 * The list carries ids (module 18) and the words come from Localisation (§22,
 * §34.3), so a point with no label is possible in a way it never was while the
 * copy sat in a typed message file. They meet here, once, on the server.
 *
 * A garment, a point or a finishing choice with no words is fatal: a field or a
 * choice with no name cannot be filled in, so the gap comes back as the ids that
 * lack wording and the page shows its error state. A STYLE with no name is only
 * a missing choice of list — the list in front of the customer still works — so
 * it is left out of the chooser and reported rather than taking the page down.
 *
 * MOD-04 — pure.
 */

import type { GarmentStyleId } from '@/lib/domain/ids';
import type { StyleOffer } from '@/lib/domain/style-offer';
import { err, ok, type Result } from '@/lib/result';

import type { MeasurementCopy } from '../schemas/measurement-copy.schema';
import type {
  CaptureSource,
  MeasurementPoint,
  MeasurementSet,
  OptionGroup,
  OptionValue,
  SetPiece,
} from '../schemas/measurement-set.schema';
import type { StudioProduct } from './studio-product';

export interface StudioPiece extends SetPiece {
  readonly label: string;
}

export interface StudioPoint extends MeasurementPoint {
  readonly label: string;
  readonly instruction: string;
}

export interface StudioOptionValue extends OptionValue {
  readonly label: string;
}

export interface StudioOptionGroup extends Omit<OptionGroup, 'values'> {
  readonly label: string;
  readonly values: readonly [StudioOptionValue, StudioOptionValue, ...StudioOptionValue[]];
}

export interface StudioSet {
  readonly garmentStyle: GarmentStyleId;
  /** How the figures are taken — a garment copied, or a tailor's card. */
  readonly source: CaptureSource;
  /** Every way the style can be measured; a choice is offered when there are two. */
  readonly sources: readonly [CaptureSource, ...CaptureSource[]];
  readonly version: number;
  /** Never empty, so the studio always has a garment to show. */
  readonly pieces: readonly [StudioPiece, ...StudioPiece[]];
  readonly points: readonly StudioPoint[];
  /** Every finishing choice the list declares, in and out of play alike. */
  readonly options: readonly StudioOptionGroup[];
}

export interface StyleOption extends StyleOffer {
  readonly label: string;
}

/** The styles to choose between, and whether the address asked for one not offered. */
export interface StyleChoice {
  readonly options: readonly StyleOption[];
  readonly fellBack: boolean;
  /**
   * The way of measuring the address asked for, if any — the customer's choice,
   * carried to every style even where it is not offered, and compared with the
   * path served to say so.
   */
  readonly requestedSource: CaptureSource | null;
  /**
   * §34 — the product the studio was opened from, once the loader has decided it
   * is one the workshop cuts. It travels with every link the studio draws, so
   * switching how the figures are taken does not lose the garment they are for.
   *
   * It lives on the CHOICE rather than beside it because it is part of the same
   * answer: what the address asked for, and what it got.
   */
  readonly product: StudioProduct | null;
}

/**
 * A style's name as the chooser shows it, or an empty string where this language
 * has none — a style with no wording is left out of the chooser and reported
 * rather than taking the page down, so the name can genuinely be missing.
 */
export function styleLabelOf(styles: readonly StyleOption[], garmentStyle: GarmentStyleId): string {
  return styles.find((style) => style.garmentStyle === garmentStyle)?.label ?? '';
}

/** A list's identity on screen: the style, and the way it is measured. */
export function listIdOf(list: { readonly garmentStyle: string; readonly source: string }): string {
  return `${list.garmentStyle}/${list.source}`;
}

export interface JoinedStudio {
  readonly studio: StudioSet;
  readonly styles: readonly StyleOption[];
  /** Offered styles with no name in this language: left out, and reported. */
  readonly unlabelledStyles: readonly GarmentStyleId[];
}

/* Each choice and each of its values by name, and the ids with no words —
   `neckStyle`, or `neckStyle.COLLAR` — reported only once for a choice with none. */
function nameOptions(
  groups: readonly OptionGroup[],
  copy: MeasurementCopy,
): { readonly groups: StudioOptionGroup[]; readonly missing: readonly string[] } {
  const missing: string[] = [];
  const named = groups.map((group): StudioOptionGroup => {
    const text = copy.options[group.id];
    if (text === undefined) missing.push(group.id);
    const nameValue = (value: OptionValue): StudioOptionValue => {
      const label = text?.values[value.id];
      if (text !== undefined && label === undefined) missing.push(`${group.id}.${value.id}`);
      return { ...value, label: label ?? '' };
    };
    const [first, second, ...rest] = group.values;
    return {
      ...group,
      label: text?.label ?? '',
      values: [nameValue(first), nameValue(second), ...rest.map(nameValue)],
    };
  });
  return { groups: named, missing };
}

export function joinCopy(
  set: MeasurementSet,
  offers: readonly StyleOffer[],
  copy: MeasurementCopy,
): Result<JoinedStudio, readonly string[]> {
  const missing: string[] = [];

  const styles: StyleOption[] = [];
  const unlabelledStyles: GarmentStyleId[] = [];
  for (const offer of offers) {
    const label = copy.styles[offer.garmentStyle];
    if (label === undefined) unlabelledStyles.push(offer.garmentStyle);
    else styles.push({ ...offer, label });
  }

  const named = (piece: SetPiece): StudioPiece => {
    const label = copy.pieces[piece.id];
    if (label === undefined) missing.push(piece.id);
    return { ...piece, label: label ?? '' };
  };
  const [firstPiece, ...otherPieces] = set.pieces;
  const pieces: StudioSet['pieces'] = [named(firstPiece), ...otherPieces.map(named)];

  const points = set.points.map((point) => {
    const text = copy.points[point.id];
    if (text === undefined) missing.push(point.id);
    return { ...point, label: text?.label ?? '', instruction: text?.instruction ?? '' };
  });

  const options = nameOptions(set.options, copy);
  missing.push(...options.missing);

  if (missing.length > 0) return err(missing);
  return ok({
    studio: {
      garmentStyle: set.garmentStyle,
      source: set.source,
      sources: set.sources,
      version: set.version,
      pieces,
      points,
      options: options.groups,
    },
    styles,
    unlabelledStyles,
  });
}
