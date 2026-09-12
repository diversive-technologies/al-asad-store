'use client';

import { useState } from 'react';

import type { MeasurementPieceId, OptionGroupId, OptionValueId } from '@/lib/domain/ids';

import {
  askedStudio,
  choicesInPlay,
  drawingVariants,
  preferencesOf,
  type ChoiceInPlay,
  type Picks,
} from '../lib/options';
import type { StudioSet } from '../lib/studio-set';
import type { Preference } from '../schemas/profile.schema';

export interface UseStudioChoicesResult {
  /** The studio as the choices leave it: only the points asked (`askedStudio`). */
  readonly asked: StudioSet;
  readonly inPlay: readonly ChoiceInPlay[];
  readonly preferences: readonly Preference[];
  readonly choose: (group: OptionGroupId, value: OptionValueId) => void;
  /** The drawing variants the choices on one garment name. */
  readonly variantsOn: (pieceId: MeasurementPieceId) => ReadonlySet<string>;
}

/**
 * The customer's finishing choices. Picks are kept by choice across a style
 * switch, as figures are by point: a collar is a collar in whichever style. What
 * is in play, what is asked and how the drawing looks are all derived from them.
 */
export function useStudioChoices(studio: StudioSet): UseStudioChoicesResult {
  const [picks, setPicks] = useState<Picks>(() => new Map());
  const inPlay = choicesInPlay(studio.options, picks);

  return {
    asked: askedStudio(studio, inPlay),
    inPlay,
    preferences: preferencesOf(inPlay),
    choose: (group, value) => {
      setPicks((current) => new Map(current).set(group, value));
    },
    variantsOn: (pieceId) => drawingVariants(inPlay, pieceId),
  };
}
