import { describe, expect, it } from 'vitest';

import { styleOffersSchema } from '@/lib/domain/style-offer';
import { measurementCopyFor } from '@/lib/mocks/measurement-copy-db';
import { STYLE_OFFERS } from '@/lib/mocks/measurement-sets-db';

import { measurementCopySchema } from '../schemas/measurement-copy.schema';
import { joinCopy } from './studio-set';
import { lastLoadedAfter, shownStudio, type StudioData } from './studio-shown';
import { servedSet } from './test-support';

const OFFERS = styleOffersSchema.parse(STYLE_OFFERS);
const COPY = measurementCopySchema.parse(measurementCopyFor('en'));

function loadedList(garmentStyle: string): StudioData {
  const joined = joinCopy(servedSet(garmentStyle), OFFERS, COPY);
  if (!joined.ok) throw new Error(`no wording for ${joined.error.join(', ')}`);
  return {
    studio: joined.value.studio,
    choice: { options: joined.value.styles, fellBack: false, requestedSource: null, product: null },
  };
}

const KAMEEZ_SHALWAR = loadedList('KAMEEZ_SHALWAR');
const WAISTCOAT_SUIT = loadedList('WAISTCOAT_SUIT');

/*
 * TEST-08 — a switch of style whose list could not be loaded swapped the studio
 * for the unavailable page, which unmounted the form and lost every figure typed.
 * Each case is what the studio holds after a run of answers from the server: a
 * list, or `null` for one that could not be loaded.
 */
describe('which list the studio shows as the address changes', () => {
  it('shows the unavailable page only when nothing has loaded yet', () => {
    expect(shownStudio(null, lastLoadedAfter(null, null))).toEqual({ kind: 'UNAVAILABLE' });
  });

  it('shows the list the address asked for', () => {
    expect(shownStudio(KAMEEZ_SHALWAR, null)).toEqual({ kind: 'LOADED', data: KAMEEZ_SHALWAR });
  });

  it('keeps the list on screen when the switch away from it fails, and keeps it again', () => {
    const afterFirstFailure = lastLoadedAfter(lastLoadedAfter(null, KAMEEZ_SHALWAR), null);
    const afterSecondFailure = lastLoadedAfter(afterFirstFailure, null);

    expect(shownStudio(null, afterFirstFailure)).toEqual({ kind: 'KEPT', data: KAMEEZ_SHALWAR });
    expect(shownStudio(null, afterSecondFailure)).toEqual({ kind: 'KEPT', data: KAMEEZ_SHALWAR });
  });

  it('shows the new list once asking again succeeds, and keeps that one from then on', () => {
    const afterFailure = lastLoadedAfter(lastLoadedAfter(null, KAMEEZ_SHALWAR), null);
    const afterRetry = lastLoadedAfter(afterFailure, WAISTCOAT_SUIT);

    expect(shownStudio(WAISTCOAT_SUIT, afterFailure)).toEqual({
      kind: 'LOADED',
      data: WAISTCOAT_SUIT,
    });
    expect(shownStudio(null, afterRetry)).toEqual({ kind: 'KEPT', data: WAISTCOAT_SUIT });
  });
});
