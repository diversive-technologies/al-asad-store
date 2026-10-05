import { useEffect } from 'react';

import { OnDemand } from '@/components/shared/OnDemand';
import { onDemandPart } from '@/hooks/use-on-demand';
import { useMessages } from '@/i18n/use-messages';
import type { MeasurementPointId } from '@/lib/domain/ids';

import type { FormView } from '../lib/form-view';
import { pointsOf } from '../lib/measurement-set';
import type { StudioSet } from '../lib/studio-set';
import { GarmentFieldset } from './GarmentFieldset';
import type { FieldStatus } from './MeasurementField';
import { PieceOptions } from './PieceOptions';
import type { StudioFlow } from './studio-flow';

/*
 * Deliberate code split (PERF-10, L-01): a figure's note exists only after the
 * server's check has asked about it, so a page can never open on one. It is
 * fetched as soon as the studio is on screen, long before a check can answer, and
 * drawn when it arrives; a download that fails says so in its place with Try
 * again (`useOnDemand`), and the fields stay as they were.
 */
const fieldNote = onDemandPart(() => import('./FieldNote'));

export interface MeasurementFieldsetsProps {
  /** The studio as asked: only the garments and points the choices ask for. */
  readonly studio: StudioSet;
  readonly flow: StudioFlow;
  /** What each field says, and which garments the summaries list — see `formView`. */
  readonly view: FormView;
}

/**
 * Garment by garment: its finishing choices first, then its measurements. On the
 * garment path the choices describe the garment in hand and decide what is asked;
 * off a card they describe the garment to be stitched and ask for nothing, and
 * the line above them says which. Rendered inside `MeasurementStudio`'s client
 * boundary (MOD-06).
 */
export function MeasurementFieldsets({ studio, flow, view }: MeasurementFieldsetsProps) {
  const t = useMessages().madeToMeasure;
  useEffect(() => {
    fieldNote.warm();
  }, []);
  const hint = studio.source === 'TAILOR_CARD' ? t.choicesHintCard : t.choicesHint;

  function statusOf(id: MeasurementPointId): FieldStatus {
    const note = view.notes.get(id);
    return {
      error: view.problems.get(id),
      note:
        note === undefined ? undefined : (
          <OnDemand part={fieldNote}>
            {(loaded) => (
              <loaded.FieldNote
                id={id}
                view={note}
                actions={{
                  isKept: flow.notes.isKept,
                  onKeep: flow.notes.toggleKeep,
                  onAgain: () => {
                    flow.measureAgain(id);
                  },
                }}
              />
            )}
          </OnDemand>
        ),
    };
  }

  return (
    <>
      {studio.pieces.map((piece) => (
        <GarmentFieldset
          key={piece.id}
          piece={piece}
          points={pointsOf(studio.points, piece.id)}
          measuring={flow.measuring}
          activeId={flow.focus.activeId}
          onActivate={flow.activate}
          statusOf={statusOf}
        >
          <PieceOptions
            choices={flow.choices.inPlay.filter((choice) => choice.group.pieceId === piece.id)}
            hint={hint}
            onChoose={flow.choices.choose}
          />
        </GarmentFieldset>
      ))}
    </>
  );
}
