import type { Messages } from '@/i18n/messages/en';
import { assertNever } from '@/lib/result';

import type { TryOnResult } from '../schemas/try-on.schema';

/**
 * MOD-04 — pure. Which of the panel's three faces is on screen, what its one
 * status line says, and where focus goes when the face changes — kept here so
 * each is tested without a document.
 */

/** The two outcomes that carry an image. */
export type TryOnPicture = Extract<TryOnResult, { status: 'READY' | 'SAMPLE' }>;

/** Pick, wait, look — with what each face needs to be drawn. */
export type TryOnFace =
  | { readonly kind: 'PICKER' }
  | { readonly kind: 'PENDING'; readonly previewUrl: string }
  | { readonly kind: 'RESULT'; readonly picture: TryOnPicture };

export interface TryOnFaceState {
  readonly result: TryOnResult | undefined;
  readonly isPending: boolean;
  readonly previewUrl: string | null;
}

/**
 * An image that came back is looked at; a request in flight is waited on — and
 * it always has a photo, since `submit` refuses without one, which the check
 * keeps a fact rather than an assumption; everything else is the picker, where
 * an UNAVAILABLE answer is said in words.
 */
export function tryOnFaceOf({ result, isPending, previewUrl }: TryOnFaceState): TryOnFace {
  if (result !== undefined && result.status !== 'UNAVAILABLE') {
    return { kind: 'RESULT', picture: result };
  }
  if (isPending && previewUrl !== null) return { kind: 'PENDING', previewUrl };
  return { kind: 'PICKER' };
}

/**
 * The panel's ONE status line, which outlives every face so a change of face is
 * an update a screen reader reads rather than a region created already holding
 * its words.
 *
 * The wait says how long it can take. A result says nothing here: focus moves to
 * its heading, which says it. The picker says what its notice says, if anything.
 */
export function tryOnStatusOf(
  face: TryOnFace,
  notice: string | null,
  t: Messages['tryOn'],
): string {
  switch (face.kind) {
    case 'PENDING':
      return t.generatingNote;
    case 'RESULT':
      return '';
    case 'PICKER':
      return notice ?? '';
    default:
      return assertNever(face);
  }
}

/** A control or line on the panel that focus can be handed to. */
export type TryOnFocusTarget = 'STATUS' | 'RESULT_HEADING' | 'GENERATE' | 'PHOTO_INPUT';

/**
 * A11Y-08 — where focus goes when the panel changes face. Every change removes
 * the control that had it, and focus used to fall to the page each time.
 *
 * - The wait: the status line, which says how long it can take.
 * - A result: its heading, which names it.
 * - Back to the picker with a photo still chosen — a failure — Generate, to try
 *   again; with none — "Try another photo" — the photo picker.
 */
export function focusTargetFor(face: TryOnFace['kind'], hasPhoto: boolean): TryOnFocusTarget {
  switch (face) {
    case 'PENDING':
      return 'STATUS';
    case 'RESULT':
      return 'RESULT_HEADING';
    case 'PICKER':
      return hasPhoto ? 'GENERATE' : 'PHOTO_INPUT';
    default:
      return assertNever(face);
  }
}
