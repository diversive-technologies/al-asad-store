'use client';

import type { Note } from '../lib/field-notes';
import { fieldNoteId } from '../lib/field-row';
import type { FieldNoteView } from '../lib/note-text';

export interface FieldNoteActions {
  readonly isKept: (note: Note) => boolean;
  readonly onKeep: (note: Note) => void;
  /** Back to the field, with the drawing showing where the tape goes. */
  readonly onAgain: () => void;
}

export interface FieldNoteProps {
  readonly id: string;
  readonly view: FieldNoteView;
  readonly actions: FieldNoteActions;
}

/**
 * A figure the tailor's rules ask about — quiet, and never an error.
 *
 * It carries no colour of its own beyond the studio's gold rule, no `role`, and
 * no `aria-invalid`: nothing here is wrong, and the customer may be right. The
 * words say what looks unusual and offer the two honest answers — measure it
 * again, or keep the figure and have us record that you checked.
 *
 * "Keep my number" is a TOGGLE whose label never changes: replacing it with a
 * line would hide the button that was just pressed, and focus would fall to the
 * page. Pressing it again withdraws the keep; nothing is sent until the next check.
 */
export function FieldNote({ id, view, actions }: FieldNoteProps) {
  const { text, notes } = view;
  const kept = notes.some((note) => actions.isKept(note));

  return (
    <div className="mm-field-note">
      {/* Only the WORDS describe the field. `aria-describedby` flattens what it
          points at, so the buttons inside it would be read to a screen-reader
          customer as prose — on the one field whose point is to offer a choice. */}
      <div id={fieldNoteId(id)} className="mm-field-note-words">
        {text.items.map((item, index) => {
          const note = notes[index];
          const isKept = note !== undefined && actions.isKept(note);
          return (
            <p key={item.key} className="text-fg text-xs text-pretty">
              {isKept ? item.keptText : item.text}
            </p>
          );
        })}

        {kept ? null : <p className="text-fg-muted text-xs">{text.ask}</p>}
      </div>

      <div className="mm-field-note-actions">
        <button type="button" className="mm-field-note-action" onClick={actions.onAgain}>
          {text.againLabel}
        </button>
        {notes.map((note, index) => (
          <button
            key={text.items[index]?.key ?? String(index)}
            type="button"
            className="mm-field-note-action"
            aria-pressed={actions.isKept(note)}
            onClick={() => {
              actions.onKeep(note);
            }}
          >
            {text.keepLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
