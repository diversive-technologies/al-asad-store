import { useMessages } from '@/i18n/use-messages';
import type { MeasurementPointId } from '@/lib/domain/ids';

import type { FormView } from '../lib/form-view';
import { pointsOf } from '../lib/measurement-set';
import type { StudioSet } from '../lib/studio-set';
import { FieldNote } from './FieldNote';
import { GarmentFieldset } from './GarmentFieldset';
import type { FieldStatus } from './MeasurementField';
import { PieceOptions } from './PieceOptions';
import type { StudioFlow } from './studio-flow';

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
  const hint = studio.source === 'TAILOR_CARD' ? t.choicesHintCard : t.choicesHint;

  function statusOf(id: MeasurementPointId): FieldStatus {
    const note = view.notes.get(id);
    return {
      error: view.problems.get(id),
      note:
        note === undefined ? undefined : (
          <FieldNote
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
