import { settleChoices, type PreferenceRow } from './measurement-options-db';
import { versionsOf, type SetRow, type SourceRow } from './measurement-sets-db';
import { settleAcknowledgements } from './profile-acknowledgements';
import { checkEntries } from './profile-rule-eval';
import { currentRuleSet, type RulesNow } from './profile-rule-rows';
import {
  refused,
  type AcknowledgementRow,
  type CheckRow,
  type FindingRow,
  type TypedEntryRow,
  type Unit,
} from './profile-rules';

/**
 * D1 — module 18's measurement profiles (§34.4 `validate`, `saveProfile`; A2-5,
 * A2-8), standing in for Java. The derivation and the rules are
 * `profile-rules.ts`; this is the store, and who may write to it.
 *
 * A profile is never updated in place (§34.7, D6). A save is a NEW version, and
 * the version it replaces is marked superseded and kept. Profiles belong to an
 * owner of a KIND — an account, or a device token this module issued — and the
 * kind is part of the key, so no device can ever name an account's profiles.
 */

export type { AcknowledgementRow, TypedEntryRow };

export interface SubmissionRow {
  garmentStyle: string;
  source: SourceRow;
  version: number;
  entries: TypedEntryRow[];
  preferences: PreferenceRow[];
  acknowledgedFindings: AcknowledgementRow[];
}

interface ProfileValueRow {
  pointId: string;
  enteredValue: string;
  unitEntered: Unit;
  enteredAs: 'HALF' | 'FULL';
  basis: 'GARMENT' | 'BODY';
  /** Copied off a card, or typed off a tape — read from the list, not the page. */
  origin: 'TYPED' | 'TRANSCRIBED';
  valueMm: number;
}

export interface ProfileOwnerRow {
  keptWith: 'ACCOUNT' | 'DEVICE';
  key: string;
}

interface ProfileRecord {
  id: string;
  ownerKey: string;
  keptWith: ProfileOwnerRow['keptWith'];
  garmentStyle: string;
  setVersion: number;
  /** Which rule set judged it, so a rule tightened later can tell old from new. */
  ruleSetVersion: number;
  version: number;
  /** Read off the list the figures were typed against — never taken from the page. */
  source: SourceRow;
  /** Every choice in play, as the server settled it — defaults included. */
  preferences: PreferenceRow[];
  values: ProfileValueRow[];
  acknowledgedFindings: AcknowledgementRow[];
  createdAt: string;
  supersededBy: string | null;
}

export type SavedProfileRow = Omit<ProfileRecord, 'ownerKey' | 'supersededBy'>;

export type SaveOutcomeRow =
  | { kind: 'SAVED'; profile: SavedProfileRow }
  | { kind: 'REJECTED'; findings: FindingRow[] };

/** Where a style's versions for one path come from — the served lists, or a test's own. */
export type SetsFor = (garmentStyle: string, source: SourceRow) => readonly SetRow[];

const PROFILES: ProfileRecord[] = [];
const DEVICE_TOKENS = new Set<string>();

const ownerKeyOf = (owner: ProfileOwnerRow): string => `${owner.keptWith}:${owner.key}`;

/**
 * The list a NEW submission is judged against: the CURRENT version. Older ones
 * are kept to read what was saved against them, but a stale tab saving under a
 * retired list's looser limits is refused, with its own reason.
 */
function currentListFor(
  submission: SubmissionRow,
  setsFor: SetsFor,
): { set: SetRow } | { finding: FindingRow } {
  const versions = setsFor(submission.garmentStyle, submission.source);
  const named = versions.find((set) => set.version === submission.version);
  if (named === undefined) return { finding: refused(null, 'SET_VERSION_UNKNOWN') };
  if (named !== versions.at(-1)) return { finding: refused(null, 'SET_VERSION_SUPERSEDED') };
  return { set: named };
}

/** What `validate` answers: what still stands in the way, and what it counted as kept. */
export type CheckAnswerRow = CheckRow & {
  acknowledged: AcknowledgementRow[];
  ruleSetVersion: number;
};

/** §34.4 `validate` — stores nothing. */
export function checkSubmission(
  submission: SubmissionRow,
  setsFor: SetsFor = versionsOf,
  rules: RulesNow = currentRuleSet,
): CheckAnswerRow {
  const ruleSet = rules();
  const list = currentListFor(submission, setsFor);
  if ('finding' in list) {
    return {
      findings: [list.finding],
      recorded: [],
      acknowledged: [],
      ruleSetVersion: ruleSet.version,
    };
  }
  const checked = checkEntries(
    list.set,
    submission.entries,
    submission.preferences,
    ruleSet.rows,
  );
  /* The server is the one judge of what counts as kept: a note the customer
     answered leaves the way clear and is echoed back, and anything that answers
     no finding of ours is simply not counted. */
  const settled = settleAcknowledgements(checked.findings, submission.acknowledgedFindings);
  return {
    findings: settled.outstanding,
    recorded: checked.recorded,
    acknowledged: settled.matched,
    ruleSetVersion: ruleSet.version,
  };
}

function valuesOf(set: SetRow, entries: readonly TypedEntryRow[], recorded: CheckRow['recorded']) {
  return entries.flatMap((entry): ProfileValueRow[] => {
    const point = set.points.find((candidate) => candidate.id === entry.pointId);
    const valueMm = recorded.find((value) => value.pointId === entry.pointId)?.valueMm;
    if (point === undefined || valueMm === undefined) return [];
    return [
      {
        pointId: point.id,
        enteredValue: entry.raw.trim(),
        unitEntered: entry.unit,
        enteredAs: point.enteredAs,
        basis: point.basis,
        origin: set.source === 'TAILOR_CARD' ? 'TRANSCRIBED' : 'TYPED',
        valueMm,
      },
    ];
  });
}

/* What the page is told about a saved profile: never who owns it, and never the
   bookkeeping of what superseded what. */
function projection(record: ProfileRecord): SavedProfileRow {
  return {
    id: record.id,
    keptWith: record.keptWith,
    garmentStyle: record.garmentStyle,
    setVersion: record.setVersion,
    ruleSetVersion: record.ruleSetVersion,
    version: record.version,
    source: record.source,
    preferences: record.preferences,
    values: record.values,
    acknowledgedFindings: record.acknowledgedFindings,
    createdAt: record.createdAt,
  };
}

/** §34.4 `saveProfile` — a new version, or the findings that refused it. */
export function saveProfile(
  owner: ProfileOwnerRow,
  submission: SubmissionRow,
  setsFor: SetsFor = versionsOf,
  now: Date = new Date(),
  rules: RulesNow = currentRuleSet,
): SaveOutcomeRow {
  const ruleSet = rules();
  const list = currentListFor(submission, setsFor);
  if ('finding' in list) return { kind: 'REJECTED', findings: [list.finding] };

  const { findings, recorded } = checkEntries(
    list.set,
    submission.entries,
    submission.preferences,
    ruleSet.rows,
  );
  /* A2-5 — everything still standing blocks the save, a note nobody answered
     included, and the rejection carries them all so the page can place each one. */
  const settled = settleAcknowledgements(findings, submission.acknowledgedFindings);
  if (settled.outstanding.length > 0) {
    return { kind: 'REJECTED', findings: settled.outstanding };
  }

  const mine = profilesFor(owner, submission.garmentStyle);
  const record: ProfileRecord = {
    id: crypto.randomUUID(),
    ownerKey: ownerKeyOf(owner),
    keptWith: owner.keptWith,
    garmentStyle: submission.garmentStyle,
    setVersion: list.set.version,
    ruleSetVersion: ruleSet.version,
    version: mine.length + 1,
    source: list.set.source,
    preferences: [...settleChoices(list.set.options, submission.preferences).chosen].map(
      ([group, value]) => ({ group, value }),
    ),
    values: valuesOf(list.set, submission.entries, recorded),
    // What the SERVER matched, never the list the page sent.
    acknowledgedFindings: settled.matched,
    createdAt: now.toISOString(),
    supersededBy: null,
  };

  // D6 — the version this replaces is MARKED, and both are kept.
  const current = mine.find((profile) => profile.supersededBy === null);
  if (current !== undefined) current.supersededBy = record.id;
  PROFILES.push(record);
  return { kind: 'SAVED', profile: projection(record) };
}

/** Every version one owner has saved for one style, oldest first. */
export function profilesFor(owner: ProfileOwnerRow, garmentStyle: string): ProfileRecord[] {
  const key = ownerKeyOf(owner);
  return PROFILES.filter(
    (profile) => profile.ownerKey === key && profile.garmentStyle === garmentStyle,
  );
}

/** A guest's device token, minted here as a cart id is minted by the cart module. */
export function issueDeviceToken(): string {
  const token = crypto.randomUUID();
  DEVICE_TOKENS.add(token);
  return token;
}

/** A device owner counts only with a token this module issued. */
export function isKnownOwner(owner: ProfileOwnerRow): boolean {
  return owner.keptWith === 'ACCOUNT' || DEVICE_TOKENS.has(owner.key);
}

/** The owner the BFF attached (`API_HEADERS.measurementOwner`), or null. */
export function profileOwnerOf(header: string | null): ProfileOwnerRow | null {
  if (header === null) return null;
  const at = header.indexOf(':');
  if (at < 1) return null;
  const kind = header.slice(0, at);
  const key = header.slice(at + 1);
  if (key.length === 0) return null;
  return kind === 'ACCOUNT' || kind === 'DEVICE' ? { keptWith: kind, key } : null;
}

/* Reading the body the stand-in was sent is `profile-submission.ts`: this file is
   the store, and the two have no business in one module (MOD-03). */
