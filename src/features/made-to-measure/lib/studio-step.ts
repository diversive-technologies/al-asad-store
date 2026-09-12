/**
 * Where the studio is — the fields, the review, or the confirmation — as a value
 * DERIVED from the two requests rather than copied out of them (STATE-02).
 *
 * MOD-04 — pure: `useProfileSave` holds the requests; this reads them.
 */

import type {
  Acknowledgement,
  Finding,
  MeasurementProfile,
  MeasurementSubmission,
  Preference,
  TypedPointEntry,
} from '../schemas/profile.schema';
import type { CheckedMeasurements } from './review';
import { listIdOf, type StudioSet } from './studio-set';
import type { CheckVerdict, Stopped } from './verdicts';

/** A problem with no field to stand on: the store unreachable, or the list changed. */
export type SaveProblem = 'UNAVAILABLE' | 'STALE';

export type ReviewingStep = {
  readonly kind: 'REVIEWING';
  readonly checked: CheckedMeasurements;
  readonly isSaving: boolean;
  readonly problem: SaveProblem | null;
};

export type StudioStep =
  | { readonly kind: 'EDITING'; readonly isChecking: boolean; readonly problem: SaveProblem | null }
  | ReviewingStep
  | { readonly kind: 'SAVED'; readonly profile: MeasurementProfile };

/** A save's outcome, judged as it lands. */
export type SaveResult =
  | { readonly kind: 'SAVED'; readonly profile: MeasurementProfile }
  | { readonly kind: 'REJECTED'; readonly verdict: Stopped };

/** What the step is read from — a TanStack mutation result satisfies it as it is. */
export interface RequestState<TData> {
  readonly data: TData | undefined;
  readonly variables: MeasurementSubmission | undefined;
  readonly isPending: boolean;
  readonly isError: boolean;
}

/* What an answer is about: the list AND the finishing choices it was sent with.
   A choice changed while a check was pending asks for different points, so the
   answer is about something no longer on screen. */
export const keyOf = (
  list: { readonly garmentStyle: string; readonly source: string; readonly version: number },
  preferences: readonly Preference[],
): string =>
  `${listIdOf(list)}@${String(list.version)}|${preferences
    .map((preference) => `${preference.group}=${preference.value}`)
    .join(',')}`;

export const sentKey = (sent: MeasurementSubmission): string => keyOf(sent, sent.preferences);

/**
 * What is sent: the figures, the choices that ask for them, and every note the
 * customer has answered by keeping their figure. An answer travels only for a
 * point whose figure is going too — the server counts it against a finding it
 * raises on this submission, and raises none for a figure it was not sent.
 */
export function submissionOf(
  studio: Pick<StudioSet, 'garmentStyle' | 'source' | 'version'>,
  entries: readonly TypedPointEntry[],
  preferences: readonly Preference[],
  acknowledged: readonly Acknowledgement[] = [],
): MeasurementSubmission {
  const sent = new Set(entries.map((entry) => entry.pointId));
  return {
    garmentStyle: studio.garmentStyle,
    source: studio.source,
    version: studio.version,
    entries: [...entries],
    preferences: [...preferences],
    acknowledgedFindings: acknowledged.filter((answer) => sent.has(answer.pointId)),
  };
}

/**
 * Where an answer from the server goes: refusals to the fields in red, notes to
 * the quiet channel. The studio supplies it, and the save hook pours into it.
 */
export interface FindingsSink {
  readonly show: (answer: {
    readonly refused: readonly Finding[];
    readonly notes: readonly Finding[];
    /** The figures the answer was about, so a note stands only while they do. */
    readonly sent: readonly TypedPointEntry[];
  }) => void;
  /** The notes answered and still standing, read as a request is made. */
  readonly acknowledged: () => readonly Acknowledgement[];
}

function problemOf(isError: boolean, isStale: boolean): SaveProblem | null {
  if (isError) return 'UNAVAILABLE';
  return isStale ? 'STALE' : null;
}

/**
 * The step shown, with what the requests hold. A review needs a PASSED check; a
 * confirmation needs a SAVED profile; anything else is the fields. `key` is the
 * list and choices on screen (`keyOf`).
 */
export function stepOf(
  shown: StudioStep['kind'],
  key: string,
  checking: RequestState<CheckVerdict>,
  saving: RequestState<SaveResult>,
): StudioStep {
  if (shown === 'SAVED' && saving.data?.kind === 'SAVED') {
    return { kind: 'SAVED', profile: saving.data.profile };
  }
  const sent = checking.variables;
  if (shown === 'REVIEWING' && checking.data?.kind === 'PASSED' && sent !== undefined) {
    const rejected = saving.data?.kind === 'REJECTED' ? saving.data.verdict : null;
    return {
      kind: 'REVIEWING',
      checked: {
        entries: sent.entries,
        preferences: sent.preferences,
        recorded: checking.data.recorded,
        acknowledged: checking.data.acknowledged,
      },
      isSaving: saving.isPending,
      problem: problemOf(saving.isError, rejected?.kind === 'STALE'),
    };
  }
  // An answer about another list, or other choices, says nothing about this one.
  const aboutThis = sent !== undefined && sentKey(sent) === key;
  return {
    kind: 'EDITING',
    isChecking: checking.isPending,
    problem: aboutThis ? problemOf(checking.isError, checking.data?.kind === 'STALE') : null,
  };
}
