'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

import type { MeasurementPointId } from '@/lib/domain/ids';

import { acknowledgementOf, isNote, noteKey, type Note } from '../lib/field-notes';
import { basisOf, figuresStand, type FigureBasis } from '../lib/standing';
import type { Unit } from '../lib/units';
import type { MeasurementPoint } from '../schemas/measurement-set.schema';
import type { Acknowledgement, Finding, TypedPointEntry } from '../schemas/profile.schema';

interface Held {
  readonly note: Note;
  /** The figures the server judged, so the note stands exactly while they do. */
  readonly basis: FigureBasis;
}

export interface UseFieldNotesResult {
  /** The notes standing on one field, in the order the server sent them. */
  readonly on: (id: MeasurementPointId) => readonly Note[];
  readonly isKept: (note: Note) => boolean;
  /** Keep this figure, or withdraw the keep. Nothing is sent until the next check. */
  readonly toggleKeep: (note: Note) => void;
  /** Every figure kept and still standing, for the request being made. */
  readonly acknowledged: () => readonly Acknowledgement[];
  /** Notes nobody has answered yet — what holds the review back. */
  readonly outstanding: number;
  readonly place: (findings: readonly Finding[], sent: readonly TypedPointEntry[]) => void;
  readonly summaryRef: RefObject<HTMLDivElement | null>;
}

/* The quiet summary's focus, and the only effect: a notes-only answer has nowhere
   else to land, while a refusal keeps the red summary's landing. The request is
   spent on the render it was armed for whether or not it is used — left armed
   behind a refusal it would fire later, on the keystroke that clears the last red
   field, and take focus out from under the customer. */
function useNotesFocus(canLand: boolean): {
  readonly summaryRef: RefObject<HTMLDivElement | null>;
  readonly request: () => void;
} {
  const summaryRef = useRef<HTMLDivElement>(null);
  const wantsFocus = useRef(false);

  useEffect(() => {
    if (!wantsFocus.current) return;
    wantsFocus.current = false;
    if (canLand) summaryRef.current?.focus();
  });

  return {
    summaryRef,
    request: () => {
      wantsFocus.current = true;
    },
  };
}

/**
 * The QUIET channel: figures the rules ask about, and the customer's answer.
 *
 * A note is never an error. It does not reach `form.setError`, so it is never
 * red, never `aria-invalid`, never in the error summary and never in the count of
 * what is wrong. What is held is an event's result — the notes this answer
 * carried — and the customer's own decisions; neither is server state mirrored
 * into state (STATE-02), and both are judged again on every render rather than
 * cleared by an effect (STATE-04).
 *
 * `key` is the list and the choices on screen: an answer about another list, or
 * about other choices, is simply not shown, which is what makes a kept figure
 * per path — the two paths have different point ids.
 */
export function useFieldNotes(
  points: readonly MeasurementPoint[],
  values: Readonly<Record<string, string | undefined>>,
  unit: Unit,
  key: string,
  hasErrors: boolean,
): UseFieldNotesResult {
  const [placed, setPlaced] = useState<{ key: string; notes: readonly Held[] }>({
    key,
    notes: [],
  });
  const [kept, setKept] = useState<ReadonlyMap<string, Held>>(new Map());

  const stands = (held: Held): boolean => figuresStand(held.basis, points, values, unit);
  const standing = placed.key === key ? placed.notes.filter(stands) : [];
  const keptNow = [...kept.values()].filter(stands);
  const isKept = (note: Note): boolean =>
    keptNow.some((held) => noteKey(held.note) === noteKey(note));
  const focus = useNotesFocus(standing.length > 0 && !hasErrors);

  return {
    on: (id) => standing.filter((held) => held.note.pointId === id).map((held) => held.note),
    isKept,
    toggleKeep: (note) => {
      const key = noteKey(note);
      const held = placed.notes.find((candidate) => noteKey(candidate.note) === key);
      if (held === undefined) return;
      /* On whether this note is kept NOW — not on whether the map still holds an
         answer whose figures have since changed. Such an answer is no longer in
         force, and letting it decide would invert the press: the customer would
         press Keep and see nothing, then press again to get it. */
      const keptAlready = keptNow.some((candidate) => noteKey(candidate.note) === key);
      setKept((before) => {
        const next = new Map(before);
        if (keptAlready) next.delete(key);
        else next.set(key, held);
        return next;
      });
    },
    acknowledged: () => keptNow.map((held) => acknowledgementOf(held.note)),
    outstanding: standing.filter((held) => !isKept(held.note)).length,
    place: (findings, sent) => {
      const notes = findings.filter(isNote).map((note) => ({
        note,
        basis: basisOf([note.pointId, ...note.relatedPoints], sent),
      }));
      setPlaced({ key, notes });
      /* An answer belongs to the figures it was given for: one whose figures have
         changed is let go here rather than lingering to apply again if the
         customer happens to type its figure back. */
      setKept((before) => new Map([...before].filter(([, held]) => stands(held))));
      if (notes.length > 0) focus.request();
    },
    summaryRef: focus.summaryRef,
  };
}
