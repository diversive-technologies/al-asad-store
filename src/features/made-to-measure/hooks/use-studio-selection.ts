'use client';

import { useState } from 'react';

import type { MeasurementPieceId, MeasurementPointId } from '@/lib/domain/ids';

import { pointById } from '../lib/measurement-set';
import { listIdOf, type StudioPiece, type StudioPoint, type StudioSet } from '../lib/studio-set';

export interface UseStudioSelectionResult {
  /** The measurement in hand, if any. */
  readonly active: StudioPoint | null;
  /** The garment on the table: the active measurement's, or the one being browsed. */
  readonly piece: StudioPiece;
  /** Chooses a measurement and puts the caret in its field. */
  readonly activate: (id: MeasurementPointId) => void;
  /** Chooses a measurement whose field already has focus — or none. */
  readonly choose: (id: MeasurementPointId | null) => void;
  readonly browse: (piece: MeasurementPieceId) => void;
}

/**
 * Which measurement, and so which garment, the studio is showing.
 *
 * The garment is DERIVED from the active measurement rather than held beside it.
 * Two pieces of state that both decide which garment is shown can disagree, and
 * the one that disagrees is always the drawing.
 */
export function useStudioSelection(
  studio: StudioSet,
  focusField: (id: MeasurementPointId) => void,
): UseStudioSelectionResult {
  const [browsing, setBrowsing] = useState<MeasurementPieceId>(studio.pieces[0].id);
  const [chosenId, setChosenId] = useState<MeasurementPointId | null>(null);
  const listKey = listIdOf(studio);
  const [shownList, setShownList] = useState(listKey);

  /* A new list — another style, or another way of measuring — starts the drawing
     afresh: nothing chosen, first garment. Reset while rendering, React's pattern
     for state that follows a prop, so a point chosen on one list can never come
     back chosen (and lock a phone into focus mode) when that list returns. */
  if (shownList !== listKey) {
    setShownList(listKey);
    setChosenId(null);
    setBrowsing(studio.pieces[0].id);
  }

  const active = pointById(studio.points, chosenId) ?? null;
  const shownPieceId = active?.pieceId ?? browsing;

  return {
    active,
    piece: studio.pieces.find((candidate) => candidate.id === shownPieceId) ?? studio.pieces[0],
    activate: (id) => {
      setChosenId(id);
      focusField(id);
    },
    choose: setChosenId,
    browse: (next) => {
      setBrowsing(next);
      // Or the drawing would jump straight back to the measurement in hand.
      setChosenId(null);
    },
  };
}
