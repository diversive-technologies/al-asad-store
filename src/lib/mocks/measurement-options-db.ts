/**
 * D1 — the finishing choices module 18 serves on each set read (§34.5
 * `options[]`, A2-7 as amended after Phase 2), and the rule that settles what a
 * submission chose, standing in for Java.
 *
 * FIXTURE, every value and every default. The choices are the ones the client
 * named — collar or ban, the ban's width and its ends, a cuff or a plain sleeve,
 * a single or a double cuff — but what narrow and wide, round and square and
 * double mean, which is the default, and whether a plain sleeve is offered at all
 * are plan question 5. No choice carries a charge until the client confirms one
 * exists.
 */

export interface ConditionRow {
  group: string;
  values: string[];
}

export interface OptionGroupRow {
  id: string;
  pieceId: string;
  defaultValue: string;
  appliesWhen: ConditionRow | null;
  values: { id: string; drawingVariant: string | null }[];
}

export interface PreferenceRow {
  group: string;
  value: string;
}

export const KAMEEZ_OPTIONS: readonly OptionGroupRow[] = [
  {
    id: 'neckStyle',
    pieceId: 'KAMEEZ',
    // The ban is the kameez the studio has always drawn.
    defaultValue: 'BAN',
    appliesWhen: null,
    values: [
      { id: 'BAN', drawingVariant: null },
      { id: 'COLLAR', drawingVariant: 'COLLAR' },
    ],
  },
  {
    id: 'banWidth',
    pieceId: 'KAMEEZ',
    defaultValue: 'NARROW',
    appliesWhen: { group: 'neckStyle', values: ['BAN'] },
    values: [
      { id: 'NARROW', drawingVariant: null },
      { id: 'WIDE', drawingVariant: 'BAN_WIDE' },
    ],
  },
  {
    id: 'banShape',
    pieceId: 'KAMEEZ',
    defaultValue: 'ROUND',
    appliesWhen: { group: 'neckStyle', values: ['BAN'] },
    values: [
      { id: 'ROUND', drawingVariant: null },
      { id: 'SQUARE', drawingVariant: 'BAN_SQUARE' },
    ],
  },
  {
    id: 'sleeveFinish',
    pieceId: 'KAMEEZ',
    defaultValue: 'CUFF',
    appliesWhen: null,
    values: [
      { id: 'CUFF', drawingVariant: null },
      { id: 'PLAIN', drawingVariant: 'SLEEVE_PLAIN' },
    ],
  },
  {
    id: 'cuffStyle',
    pieceId: 'KAMEEZ',
    defaultValue: 'SINGLE',
    appliesWhen: { group: 'sleeveFinish', values: ['CUFF'] },
    values: [
      { id: 'SINGLE', drawingVariant: null },
      { id: 'DOUBLE', drawingVariant: 'CUFF_DOUBLE' },
    ],
  },
];

export type OptionProblem = 'OPTION_UNKNOWN' | 'OPTION_NOT_APPLICABLE';

/** Whether a condition holds under the settled choices — a point's, or a rule's. */
export const conditionHolds = (
  condition: ConditionRow | null,
  chosen: ReadonlyMap<string, string>,
): boolean => condition === null || condition.values.includes(chosen.get(condition.group) ?? '');

/**
 * Every choice in play and its value — what was sent, or the default — and what
 * in the submission could not be a choice: a choice or value the list does not
 * have, or a choice sent while it does not apply (a ban's width with a collar).
 */
export function settleChoices(
  groups: readonly OptionGroupRow[],
  sent: readonly PreferenceRow[],
): { chosen: Map<string, string>; problems: OptionProblem[] } {
  const chosen = new Map<string, string>();
  const problems: OptionProblem[] = [];

  for (const preference of sent) {
    const group = groups.find((candidate) => candidate.id === preference.group);
    if (group === undefined || !group.values.some((value) => value.id === preference.value)) {
      problems.push('OPTION_UNKNOWN');
    }
  }

  for (const group of groups) {
    const pick = sent.find((preference) => preference.group === group.id);
    if (!conditionHolds(group.appliesWhen, chosen)) {
      if (pick !== undefined) problems.push('OPTION_NOT_APPLICABLE');
      continue;
    }
    const known = pick !== undefined && group.values.some((value) => value.id === pick.value);
    chosen.set(group.id, known ? pick.value : group.defaultValue);
  }

  return { chosen, problems };
}

/** Whether a point is asked, given the choices in play. */
export function isAskedRow(
  point: { askedWhen?: ConditionRow | null },
  chosen: ReadonlyMap<string, string>,
): boolean {
  return conditionHolds(point.askedWhen ?? null, chosen);
}
