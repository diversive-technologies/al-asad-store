/**
 * Whether the finishing choices can leave a garment with nothing to measure.
 *
 * A finishing choice decides WHICH of a garment's points are asked — a cuff with a
 * cuff, the sleeve opening with a plain sleeve (A2-7) — never whether the garment
 * is measured at all: which garments are cut is the style, and a style is its own
 * list. So a list in which some combination of choices asks nothing on a garment
 * is a malformed list. The workshop would be sent a garment with no figures, or
 * the page an empty form; the contract refuses it instead, where every other
 * malformed row is refused (DATA-02).
 *
 * Judged without enumerating combinations. Thirty-two choices of two values each
 * would be four billion of them; instead each choice is asked once whether it can
 * be settled so that nothing on the garment is asked — by a value that asks
 * nothing itself and brings into play only choices that can be settled the same
 * way. The contract puts every choice after the one it depends on, so the walk
 * only ever goes forward and ends, and each choice is judged once.
 *
 * Structural types rather than the schema's, because the schema is what calls
 * this; nothing here depends on how the list was parsed.
 *
 * MOD-04 — pure.
 */

interface CoverageCondition {
  readonly group: string;
  readonly values: readonly string[];
}

interface CoverageGroup {
  readonly id: string;
  readonly appliesWhen: CoverageCondition | null;
  readonly values: readonly { readonly id: string }[];
}

interface CoveragePoint {
  readonly pieceId: string;
  readonly askedWhen: CoverageCondition | null;
}

export interface CoverageList {
  readonly pieces: readonly { readonly id: string }[];
  readonly points: readonly CoveragePoint[];
  readonly options: readonly CoverageGroup[];
}

/* For each choice, the values that would ask something on the garment. A point
   asked with no condition is asked whatever is chosen: answered as null. */
function askingValues(
  points: readonly CoveragePoint[],
): ReadonlyMap<string, ReadonlySet<string>> | null {
  const asking = new Map<string, Set<string>>();
  for (const point of points) {
    if (point.askedWhen === null) return null;
    const values = asking.get(point.askedWhen.group) ?? new Set<string>();
    for (const value of point.askedWhen.values) values.add(value);
    asking.set(point.askedWhen.group, values);
  }
  return asking;
}

function canLeaveUnasked(list: CoverageList, pieceId: string): boolean {
  const asking = askingValues(list.points.filter((point) => point.pieceId === pieceId));
  if (asking === null) return false;

  const judged = new Map<number, boolean>();
  /* Whether the choice at `index`, once in play, can be settled so nothing on the
     garment is asked. Only choices declared AFTER it can depend on it. */
  const settlesQuietly = (index: number): boolean => {
    const known = judged.get(index);
    if (known !== undefined) return known;
    const group = list.options[index];
    if (group === undefined) return true;
    const dependents = list.options.flatMap((candidate, at) =>
      at > index && candidate.appliesWhen?.group === group.id
        ? [{ at, values: candidate.appliesWhen.values }]
        : [],
    );
    const quiet = group.values.some(
      (value) =>
        asking.get(group.id)?.has(value.id) !== true &&
        dependents.every(({ at, values }) => !values.includes(value.id) || settlesQuietly(at)),
    );
    judged.set(index, quiet);
    return quiet;
  };

  // A choice always offered is always in play; every other is reached through one.
  return list.options.every((group, index) => group.appliesWhen !== null || settlesQuietly(index));
}

/**
 * The garments some combination of the choices leaves with nothing asked, by their
 * index in the list's pieces — empty for a well-formed list.
 */
export function piecesLeftUnasked(list: CoverageList): readonly number[] {
  return list.pieces.flatMap((piece, index) => (canLeaveUnasked(list, piece.id) ? [index] : []));
}
