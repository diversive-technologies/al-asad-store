import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/messages/en';

import { tryOnResultSchema } from '../schemas/try-on.schema';
import {
  focusTargetFor,
  tryOnFaceOf,
  tryOnStatusOf,
  type TryOnFace,
  type TryOnPicture,
} from './try-on-face';

/**
 * The try-on panel's three faces, its one status line and where focus goes
 * between them (A11Y-05, A11Y-08). Every change of face removes the control that
 * had focus — Generate, when the wait begins; the whole wait, when the image
 * arrives or fails — and focus used to fall to the page each time, while the
 * wait and the result went unannounced.
 */

const SAMPLE: TryOnPicture = {
  status: 'SAMPLE',
  image: { dataUrl: 'data:image/jpeg;base64,AA==', widthPx: 4, heightPx: 5 },
};
const UNAVAILABLE = tryOnResultSchema.parse({ status: 'UNAVAILABLE', reason: 'PROVIDER_FAILED' });
const PREVIEW = 'blob:photo';

describe('tryOnFaceOf', () => {
  it.each([
    ['an image that came back is looked at', { result: SAMPLE, isPending: false }, 'RESULT'],
    ['a request in flight is waited on', { result: undefined, isPending: true }, 'PENDING'],
    ['an answer of no image is the picker', { result: UNAVAILABLE, isPending: false }, 'PICKER'],
    ['nothing asked yet is the picker', { result: undefined, isPending: false }, 'PICKER'],
  ] as const)('%s', (_case, state, kind) => {
    expect(tryOnFaceOf({ ...state, previewUrl: PREVIEW }).kind).toBe(kind);
  });
});

describe('tryOnStatusOf — the one line that outlives every face', () => {
  const t = en.tryOn;

  it.each([
    [
      'says how long the wait can take',
      { kind: 'PENDING', previewUrl: PREVIEW },
      null,
      t.generatingNote,
    ],
    [
      'says what the picker has to say',
      { kind: 'PICKER' },
      t.unavailableFailed,
      t.unavailableFailed,
    ],
    ['says nothing when the picker has nothing to say', { kind: 'PICKER' }, null, ''],
    ['leaves a result to its heading', { kind: 'RESULT', picture: SAMPLE }, null, ''],
  ] as const)('%s', (_case, face: TryOnFace, notice, expected) => {
    expect(tryOnStatusOf(face, notice, t)).toBe(expected);
  });
});

describe('focusTargetFor — where focus goes when the face changes', () => {
  it.each([
    ['the wait holds it on the status line', 'PENDING', true, 'STATUS'],
    ['an image hands it to the result’s heading', 'RESULT', true, 'RESULT_HEADING'],
    ['a failure, photo still chosen, hands it back to Generate', 'PICKER', true, 'GENERATE'],
    ['starting again, with no photo, hands it to the photo picker', 'PICKER', false, 'PHOTO_INPUT'],
  ] as const)('%s', (_case, face, hasPhoto, target) => {
    expect(focusTargetFor(face, hasPhoto)).toBe(target);
  });
});
