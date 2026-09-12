import type { ConditionRow } from './measurement-options-db';

/**
 * D1 — the tailor's RULES, as rows (§34.4, A2-6), standing in for Java. The
 * evaluator is `profile-rule-eval.ts`; the store is `profiles-db.ts`.
 *
 * **FIXTURE — every row, every ratio, every tolerance and every severity**, until
 * the client's written list arrives (plan questions 3 and 4). A rule is a
 * deterministic row of integers: no model produces or checks a figure anywhere
 * (A2-11). When the list arrives it replaces ROWS, never code.
 *
 * The ratios below were fitted so that nothing fires on any figures we already
 * hold — the client's own card example and the fixtures in the tests:
 *
 * | id | severity | point ← from | expected | below / above |
 * | --- | --- | --- | --- | --- |
 * | hemAtLeastChest | MUST | hem ← chest | the chest itself | 0 / — |
 * | shoulderForChest | WARN | shoulder ← chest | 0.436 × chest | 25 / 50 mm |
 * | neckForChestBan | WARN | neck ← chest | 0.369 × chest | 19 / 38 mm |
 * | neckForChestCollar | WARN | neck ← chest | 0.369 × chest | 19 / 51 mm |
 * | waistcoatOverKameez | WARN | waistcoat chest ← kameez chest | the kameez chest | 0 / — |
 *
 * Checked by hand against the fixtures: the card example (chest 991 mm) expects a
 * 432 mm shoulder and has 432, and expects a 366 mm neck against 394 (+28, inside
 * 38); the tests' garment pair (chest 1067) expects 465 against 457 (−8, inside
 * 25) and a neck of 394 against 394.
 *
 * **No cuff rule, deliberately.** The only evidence for a chest-to-cuff
 * proportion is the client's single card, where the shoulder and the cuff both
 * read 8.5 — and plan question 3 asks whether that is one number used twice. A
 * rule built on it would turn a possible transcription slip into tailoring.
 */

export interface RuleRow {
  /** A plain code, as a point's id is. A changed rule takes a NEW id (D6). */
  readonly id: string;
  /** MUST refuses the save; WARN asks the customer, who may keep their number. */
  readonly severity: 'MUST' | 'WARN';
  /** The GARMENT point the finding lands on — a card point answers for it. */
  readonly point: string;
  /** The GARMENT point the expected figure is derived from. */
  readonly from: string;
  /** expected = round(permille × from ÷ 1000) + offsetMm. 1000 and 0 is "at least". */
  readonly permille: number;
  readonly offsetMm: number;
  /** A2-6 — tighter BELOW: cloth cut too small cannot be let out. */
  readonly toleranceBelowMm: number;
  /** Null where a figure cannot be too large for this rule. */
  readonly toleranceAboveMm: number | null;
  /** Only while this choice holds — a point's `askedWhen` shape, one evaluator. */
  readonly when: ConditionRow | null;
  /** False: the finding travels with `expectedMm` null, so no target figure reaches the page. */
  readonly showsTarget: boolean;
}

export interface RuleSetRow {
  readonly version: number;
  readonly rows: readonly RuleRow[];
}

/* The hem is the one rule Phase 3 shipped: a kameez no wider at the hem than at
   the chest cannot be put on. Written once — the card's own ghera and chest
   answer for the garment's (`GARMENT_POINT_OF`). */
const HEM_AT_LEAST_CHEST: RuleRow = {
  id: 'hemAtLeastChest',
  severity: 'MUST',
  point: 'kameezBottom',
  from: 'kameezChest',
  permille: 1000,
  offsetMm: 0,
  toleranceBelowMm: 0,
  toleranceAboveMm: null,
  when: null,
  showsTarget: true,
};

/* D6 — a rule set is never edited in place. The set a profile passed is recorded
   on it, so an acknowledgement's rule id stays resolvable after a rule changes. */
const V1: RuleSetRow = { version: 1, rows: [HEM_AT_LEAST_CHEST] };

const V2: RuleSetRow = {
  version: 2,
  rows: [
    HEM_AT_LEAST_CHEST,
    {
      id: 'shoulderForChest',
      severity: 'WARN',
      point: 'kameezShoulder',
      from: 'kameezChest',
      permille: 436,
      offsetMm: 0,
      toleranceBelowMm: 25,
      toleranceAboveMm: 50,
      when: null,
      showsTarget: false,
    },
    {
      id: 'neckForChestBan',
      severity: 'WARN',
      point: 'kameezNeck',
      from: 'kameezChest',
      permille: 369,
      offsetMm: 0,
      toleranceBelowMm: 19,
      toleranceAboveMm: 38,
      // A ban stands on the neck, so it is cut closer than a collar.
      when: { group: 'neckStyle', values: ['BAN'] },
      showsTarget: false,
    },
    {
      id: 'neckForChestCollar',
      severity: 'WARN',
      point: 'kameezNeck',
      from: 'kameezChest',
      permille: 369,
      offsetMm: 0,
      toleranceBelowMm: 19,
      toleranceAboveMm: 51,
      when: { group: 'neckStyle', values: ['COLLAR'] },
      showsTarget: false,
    },
    {
      // A2-3 — a rule may relate points across the pieces of one set.
      id: 'waistcoatOverKameez',
      severity: 'WARN',
      point: 'waistcoatChest',
      from: 'kameezChest',
      permille: 1000,
      offsetMm: 0,
      toleranceBelowMm: 0,
      toleranceAboveMm: null,
      when: null,
      showsTarget: false,
    },
  ],
};

export const RULE_SETS: readonly [RuleSetRow, ...RuleSetRow[]] = [V1, V2];

/** Where the rules come from — the injection seam `SetsFor` gives the lists. */
export type RulesNow = () => RuleSetRow;

export const currentRuleSet: RulesNow = () =>
  RULE_SETS.reduce((latest, set) => (set.version > latest.version ? set : latest));
