/**
 * What each field has to say, and the two summaries above them — worked out in
 * one place so the form body only renders it.
 *
 * The two channels stay apart: a refusal is an error, red and listed in the error
 * summary; a note is quiet and listed in its own. Nothing but the server's
 * severity decides which is which.
 *
 * MOD-04 — pure.
 */

import type { Locale } from '@/i18n/locales';
import type { MeasurementPointId } from '@/lib/domain/ids';

import type { UseFieldNotesResult } from '../hooks/use-field-notes';
import { describeProblems, type FieldProblem, type ProblemCopy } from './field-problems';
import { pointsOf } from './measurement-set';
import { noteTextFor, type FieldNoteView, type NoteCopy } from './note-text';
import type { StudioPiece, StudioPoint, StudioSet } from './studio-set';
import type { Unit } from './units';

/** Measurements listed under the garment they are taken from — a summary's shape. */
export interface PieceGroup {
  readonly piece: StudioPiece;
  readonly points: readonly StudioPoint[];
}

export interface FormViewParts {
  readonly studio: StudioSet;
  readonly problems: ReadonlyMap<MeasurementPointId, FieldProblem>;
  readonly notes: UseFieldNotesResult;
  readonly unit: Unit;
  readonly values: Readonly<Record<string, string | undefined>>;
  readonly locale: Locale;
}

export interface FormView {
  /** What to say under each field that has a problem. */
  readonly problems: ReadonlyMap<MeasurementPointId, string>;
  readonly notes: ReadonlyMap<MeasurementPointId, FieldNoteView>;
  readonly errorGroups: readonly PieceGroup[];
  readonly noteGroups: readonly PieceGroup[];
}

function groupsOf(studio: StudioSet, has: (id: MeasurementPointId) => boolean): PieceGroup[] {
  return studio.pieces
    .map((piece) => ({
      piece,
      points: pointsOf(studio.points, piece.id).filter((point) => has(point.id)),
    }))
    .filter((group) => group.points.length > 0);
}

export function formView(
  parts: FormViewParts,
  copy: ProblemCopy & NoteCopy,
): FormView {
  const { studio, notes, locale } = parts;
  const context = {
    unit: parts.unit,
    locale,
    values: parts.values,
    source: studio.source,
  };
  const problems = describeProblems(studio.points, parts.problems, context, copy);

  const noted = new Map<MeasurementPointId, FieldNoteView>();
  for (const point of studio.points) {
    const on = notes.on(point.id);
    const text = noteTextFor(on, studio.points, { locale, source: studio.source }, copy);
    if (text !== null) noted.set(point.id, { text, notes: on });
  }

  return {
    problems,
    notes: noted,
    errorGroups: groupsOf(studio, (id) => problems.has(id)),
    noteGroups: groupsOf(studio, (id) => noted.has(id)),
  };
}
