import type { Locale } from '@/i18n/locales';
import type { MeasurementPointId } from '@/lib/domain/ids';

import type { UseProfileSaveResult } from '../hooks/use-profile-save';
import type { StudioSet, StyleChoice } from '../lib/studio-set';
import { MeasurementFormBody } from './MeasurementFormBody';
import { MeasurementReview } from './MeasurementReview';
import { MeasurementSaved } from './MeasurementSaved';
import { StudioIntro } from './StudioIntro';
import type { StudioFlow } from './studio-flow';

export interface MeasurementPanelProps {
  readonly studio: StudioSet;
  readonly choice: StyleChoice;
  readonly flow: StudioFlow;
  readonly saving: UseProfileSaveResult;
  /** From the review back to the fields — to one of them, or to the first. */
  readonly onChange: (id: MeasurementPointId | null) => void;
  readonly locale: Locale;
}

/**
 * The form side of the studio: what this is, which style and path, and then the
 * fields, the review of them, or the saved profile. Rendered inside
 * `MeasurementStudio`'s client boundary (MOD-06).
 *
 * The form stays MOUNTED while the review shows — hidden, not removed — so every
 * field keeps its figure and its registration, and "Change" can focus one again.
 */
export function MeasurementPanel({
  studio,
  choice,
  flow,
  saving,
  onChange,
  locale,
}: MeasurementPanelProps) {
  const { step } = saving;

  return (
    <div className="mm-scene-panel">
      <div className="mm-panel-inner">
        <StudioIntro studio={studio} choice={choice} locale={locale} />

        {step.kind === 'REVIEWING' ? (
          <MeasurementReview
            studio={studio}
            step={step}
            onSave={saving.save}
            onChange={onChange}
            locale={locale}
          />
        ) : null}

        {step.kind === 'SAVED' ? (
          <MeasurementSaved
            profile={step.profile}
            /* The saved profile's own style, by the name the chooser gives it. */
            styleLabel={
              choice.options.find((style) => style.garmentStyle === step.profile.garmentStyle)
                ?.label ?? ''
            }
            onMeasureAgain={() => {
              onChange(null);
            }}
          />
        ) : null}

        <div hidden={step.kind !== 'EDITING'}>
          <MeasurementFormBody
            studio={studio}
            flow={flow}
            isChecking={step.kind === 'EDITING' && step.isChecking}
            problem={step.kind === 'EDITING' ? step.problem : null}
            locale={locale}
          />
        </div>
      </div>
    </div>
  );
}
