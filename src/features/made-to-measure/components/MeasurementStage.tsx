import type { UseObjectUrlResult } from '@/hooks/use-object-url';
import type { Locale } from '@/i18n/locales';
import { useMessages } from '@/i18n/use-messages';
import type { MeasurementPieceId, MeasurementPointId } from '@/lib/domain/ids';

import type { UseMeasurementFormResult } from '../hooks/use-measurement-form';
import { DRAWINGS } from '../lib/garment-drawings';
import { pointsOf } from '../lib/measurement-set';
import type { StudioPiece, StudioPoint, StudioSet } from '../lib/studio-set';
import { parseEntry } from '../lib/units';
import { CardNote } from './CardNote';
import { GarmentFlat } from './GarmentFlat';
import { GarmentTabs } from './GarmentTabs';
import { MeasurementCaption } from './MeasurementCaption';

/** The garment on the table, how its finishing choices draw it, and the card photo in hand. */
export interface ShownPiece {
  readonly piece: StudioPiece;
  readonly variants: ReadonlySet<string>;
  /** Copying a card, the customer's photo of it can take the drawing's place. */
  readonly note: UseObjectUrlResult;
}

export interface MeasurementStageProps {
  readonly studio: StudioSet;
  readonly shown: ShownPiece;
  readonly active: StudioPoint | null;
  readonly measuring: UseMeasurementFormResult;
  readonly onBrowse: (piece: MeasurementPieceId) => void;
  /** Null while the fields are not on screen: the marks are then only a picture. */
  readonly onSelect: ((id: MeasurementPointId) => void) | null;
  readonly locale: Locale;
}

/**
 * The drawing side of the studio: which garment is on the table, and where the
 * tape goes. Rendered inside `MeasurementStudio`'s client boundary, so it needs
 * no directive of its own (MOD-06).
 */
export function MeasurementStage({
  studio,
  shown,
  active,
  measuring,
  onBrowse,
  onSelect,
  locale,
}: MeasurementStageProps) {
  const messages = useMessages();
  const { piece } = shown;
  const entered =
    active !== null && measuring.filledIds.has(active.id)
      ? parseEntry(measuring.values[active.id] ?? '')
      : null;

  const flat = (
    <div className="mm-flat-frame">
      <GarmentFlat
        drawing={DRAWINGS[piece.drawingId]}
        variants={shown.variants}
        points={pointsOf(studio.points, piece.id)}
        activeId={active?.id ?? null}
        filledIds={measuring.filledIds}
        onSelect={onSelect}
      />
    </div>
  );

  return (
    <div className="mm-scene-stage">
      <GarmentTabs
        pieces={studio.pieces}
        current={piece.id}
        onChoose={onBrowse}
        legend={messages.madeToMeasure.garmentLabel}
      />

      {studio.source === 'TAILOR_CARD' ? <CardNote photo={shown.note}>{flat}</CardNote> : flat}

      {/* Under the drawing, not over it. Line art has no dark ground to carry
          text, so a caption laid on top fights the very lines it explains. */}
      <div className="mm-scene-note">
        <MeasurementCaption
          active={active}
          entered={entered}
          unit={measuring.unit}
          source={studio.source}
          messages={messages}
          locale={locale}
        />
      </div>
    </div>
  );
}
