/**
 * The words under a field the rules asked about.
 *
 * A note is QUIET: it says what looks unusual and offers two answers — measure it
 * again, or keep the figure. It never says a figure is wrong, and it never names
 * a target, on any point: a number to copy would be us filling the measurement in
 * for the customer. The server withholds that figure too, so neither side can
 * leak one.
 *
 * Off a card the fix is to the figure copied, never to a tape, so every string
 * has its own card wording.
 *
 * MOD-04 — pure.
 */

import type { Locale } from '@/i18n/locales';
import { formatList, formatTemplate } from '@/lib/utils/format';

import type { CaptureSource } from '../schemas/measurement-set.schema';
import { relatedLabels } from './field-problems';
import { noteKey, type Note } from './field-notes';
import type { StudioPoint } from './studio-set';

export interface NoteCopy {
  readonly noteSmaller: string;
  readonly noteLarger: string;
  readonly noteUnusual: string;
  readonly noteSmallerCard: string;
  readonly noteLargerCard: string;
  readonly noteUnusualCard: string;
  readonly noteAsk: string;
  readonly noteAskCard: string;
  readonly noteMeasureAgain: string;
  readonly noteCheckCard: string;
  readonly noteKeep: string;
  readonly noteKeepCard: string;
  readonly noteKept: string;
  readonly noteKeptCard: string;
}

export interface NoteContext {
  readonly locale: Locale;
  readonly source: CaptureSource;
}

export interface NoteItem {
  /** The note this line is for — what a keep is held against. */
  readonly key: string;
  readonly text: string;
  /** What it says once the customer has decided to stand by the figure. */
  readonly keptText: string;
}

export interface FieldNoteText {
  readonly items: readonly NoteItem[];
  readonly ask: string;
  readonly againLabel: string;
  readonly keepLabel: string;
}

/** One field's notes, with the words for them — what `FieldNote` draws. */
export interface FieldNoteView {
  readonly text: FieldNoteText;
  /** The notes themselves, in the order their lines are written. */
  readonly notes: readonly Note[];
}

function bodyOf(note: Note, related: string, copy: NoteCopy, onCard: boolean): string {
  if (related === '') return onCard ? copy.noteUnusualCard : copy.noteUnusual;
  const template =
    note.direction === 'BELOW'
      ? (onCard ? copy.noteSmallerCard : copy.noteSmaller)
      : note.direction === 'ABOVE'
        ? (onCard ? copy.noteLargerCard : copy.noteLarger)
        : (onCard ? copy.noteUnusualCard : copy.noteUnusual);
  return formatTemplate(template, { related });
}

/** What one field's notes say, or null where it has none. */
export function noteTextFor(
  notes: readonly Note[],
  points: readonly StudioPoint[],
  context: NoteContext,
  copy: NoteCopy,
): FieldNoteText | null {
  if (notes.length === 0) return null;
  const onCard = context.source === 'TAILOR_CARD';

  return {
    items: notes.map((note) => ({
      key: noteKey(note),
      // I18N-06 — several related measurements are a LIST, joined by the language.
      text: bodyOf(note, formatList(relatedLabels(note, points), context.locale), copy, onCard),
      keptText: onCard ? copy.noteKeptCard : copy.noteKept,
    })),
    ask: onCard ? copy.noteAskCard : copy.noteAsk,
    againLabel: onCard ? copy.noteCheckCard : copy.noteMeasureAgain,
    keepLabel: onCard ? copy.noteKeepCard : copy.noteKeep,
  };
}
