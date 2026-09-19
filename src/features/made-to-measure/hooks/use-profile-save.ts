'use client';

import { useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { queryKeys } from '@/lib/api/query-keys';

import type { StudioSet } from '../lib/studio-set';
import {
  keyOf,
  stepOf,
  submissionOf,
  type FindingsSink,
  type SaveResult,
  type StudioStep,
} from '../lib/studio-step';
import { splitOf } from '../lib/verdicts';
import type { MeasurementSubmission, Preference, TypedPointEntry } from '../schemas/profile.schema';
import { useProfileRequests } from './use-profile-requests';
import { useStepOnScreen, type StepOnScreen } from './use-step-on-screen';

export interface UseProfileSaveResult {
  readonly step: StudioStep;
  /** Asks the server; the review shows if it passed, the findings if it did not. */
  readonly check: (entries: readonly TypedPointEntry[]) => Promise<void>;
  readonly save: () => void;
  readonly edit: () => void;
}

/** What a save's answer can move: the step, the fields, the page and the bag. */
interface SaveLanding {
  readonly shown: StepOnScreen;
  readonly sink: FindingsSink;
  readonly refreshPage: () => void;
  readonly refreshBag: () => void;
}

/* Where a save's answer takes the studio — only ever for the list and choices it
   was sent with. */
function landSave(result: SaveResult, sent: MeasurementSubmission, landing: SaveLanding): void {
  if (!landing.shown.isCurrent(sent)) return;
  if (result.kind === 'SAVED') {
    /* The page was rendered with what was on file BEFORE this save, and the
       studio stays mounted afterwards. Left alone, the offer of saved
       measurements would go on naming the version this one just superseded,
       and taking it would put the older figures back over the new ones. The
       figures on screen are the form's and survive the refresh. */
    landing.refreshPage();
    /* The same is true of the BAG, which the page does not render: a line
       naming the version this save replaced is now marked on the server,
       and the cached summary would go on showing it unmarked. */
    if (result.replaced) landing.refreshBag();
    return landing.shown.show(sent, 'SAVED');
  }
  // A changed list stays on the review, which says so and offers the new one.
  if (result.verdict.kind === 'STALE') return;
  landing.shown.show(sent, 'EDITING');
  landing.sink.show({ ...splitOf(result.verdict.findings), sent: sent.entries });
}

/**
 * §34.4 — check with the server, answer what it asks, review, then save.
 *
 * The review's "as it will be kept" figures are the SERVER's millimetres from the
 * check, never the browser's own arithmetic (A2-2). A save the server refuses
 * goes back to the fields with the reasons on them; one refused because the list
 * changed stays on the review, which offers the new list.
 *
 * `studio` is the list as ASKED and `preferences` the choices that ask it. An
 * answer is only ever shown against the pair it was sent with (`useStepOnScreen`):
 * one landing after either changed is about something no longer on screen, and
 * is dropped — a refusal would otherwise land on fields no longer asked.
 */
export function useProfileSave(
  studio: StudioSet,
  preferences: readonly Preference[],
  sink: FindingsSink,
): UseProfileSaveResult {
  const router = useRouter();
  const queryClient = useQueryClient();
  const key = keyOf(studio, preferences);
  const shown = useStepOnScreen(key);
  const { checking, saving } = useProfileRequests(studio.points);
  // FORM-06, synchronously — `isPending` only flips after a re-render.
  const inFlight = useRef(false);
  const step = stepOf(shown.kind, key, checking, saving);

  async function check(entries: readonly TypedPointEntry[]): Promise<void> {
    const sent = submissionOf(studio, entries, preferences, sink.acknowledged());
    const verdict = await checking.mutateAsync(sent).then(
      (judged) => judged,
      () => null,
    );
    if (verdict === null || !shown.isCurrent(sent) || verdict.kind === 'STALE') return;
    // A refusal and a note both keep the customer on the fields, in their own channels.
    if (verdict.kind === 'REFUSED' || verdict.kind === 'NOTED') {
      return sink.show({ ...splitOf(verdict.findings), sent: sent.entries });
    }
    saving.reset();
    shown.show(sent, 'REVIEWING');
  }

  function save(): void {
    if (step.kind !== 'REVIEWING' || inFlight.current) return;
    inFlight.current = true;
    /* Exactly what passed: the figures, the choices, and the answers the SERVER
       itself accepted on that check. */
    const { entries, preferences: checkedChoices, acknowledged } = step.checked;
    const sent = submissionOf(studio, entries, checkedChoices, acknowledged);
    saving.mutate(sent, {
      onSettled: () => {
        inFlight.current = false;
      },
      onSuccess: (result) => {
        landSave(result, sent, {
          shown,
          sink,
          refreshPage: () => {
            router.refresh();
          },
          refreshBag: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.bag.all });
          },
        });
      },
    });
  }

  return { step, check, save, edit: shown.edit };
}
