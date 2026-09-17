import type { ReactNode } from 'react';

import type { Locale } from '@/i18n/locales';
import type { MeasurementPointId } from '@/lib/domain/ids';

import type { UseProfileSaveResult } from '../hooks/use-profile-save';
import { styleLabelOf, type StudioSet, type StyleChoice } from '../lib/studio-set';
import { MeasurementFormBody } from './MeasurementFormBody';
import { MeasurementReview } from './MeasurementReview';
import { MeasurementSaved } from './MeasurementSaved';
import { StudioIntro } from './StudioIntro';
import { TailoredAddToBag } from './TailoredAddToBag';
import type { StudioFlow } from './studio-flow';

export interface MeasurementPanelProps {
  readonly studio: StudioSet;
  readonly choice: StyleChoice;
  readonly flow: StudioFlow;
  readonly saving: UseProfileSaveResult;
  /**
   * The offer of measurements already saved, or nothing.
   *
   * A SLOT rather than a prop bundle: what can be offered depends on the form and
   * the finishing choices, which are the studio's to hold, and the panel's part in
   * it is only where on the page it goes — above the fields, and only while they
   * are the thing on screen.
   */
  readonly saved: ReactNode;
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
  saved,
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
            replaced={step.replaced}
            /* The saved profile's own style, by the name the chooser gives it. */
            styleLabel={styleLabelOf(choice.options, step.profile.garmentStyle)}
            bag={
              choice.product === null ? null : (
                <TailoredAddToBag product={choice.product} profile={step.profile} />
              )
            }
            onMeasureAgain={() => {
              onChange(null);
            }}
          />
        ) : null}

        <div hidden={step.kind !== 'EDITING'}>
          {saved}
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
