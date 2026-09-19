import type { ReactNode } from 'react';

import type { Locale } from '@/i18n/locales';
import type { MeasurementPointId } from '@/lib/domain/ids';

import type { UseProfileSaveResult } from '../hooks/use-profile-save';
import type { StudioSet, StyleChoice } from '../lib/studio-set';
import { MeasurementFormBody } from './MeasurementFormBody';
import { MeasurementOutcome } from './MeasurementOutcome';
import { StudioIntro } from './StudioIntro';
import type { StudioFlow } from './studio-flow';

/**
 * What the studio places in the panel. SLOTS rather than prop bundles: what they
 * hold is the studio's to decide, and the panel's part in it is only where on the
 * page each goes.
 */
export interface MeasurementPanelSlots {
  /**
   * A list the address asked for that could not be loaded, or nothing — under the
   * choice of list, whichever step is on screen.
   */
  readonly notice: ReactNode;
  /**
   * The offer of measurements already saved, or nothing. What can be offered
   * depends on the form and the finishing choices, which are the studio's to
   * hold; it goes above the fields, and only while they are the thing on screen.
   */
  readonly saved: ReactNode;
}

export interface MeasurementPanelProps {
  readonly studio: StudioSet;
  readonly choice: StyleChoice;
  readonly flow: StudioFlow;
  readonly saving: UseProfileSaveResult;
  readonly slots: MeasurementPanelSlots;
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
  slots,
  onChange,
  locale,
}: MeasurementPanelProps) {
  const { step } = saving;
  const isChecking = step.kind === 'EDITING' && step.isChecking;

  return (
    <div className="mm-scene-panel">
      <div className="mm-panel-inner">
        <StudioIntro studio={studio} choice={choice} notice={slots.notice} locale={locale} />

        <MeasurementOutcome
          studio={studio}
          choice={choice}
          saving={saving}
          onChange={onChange}
          locale={locale}
        />

        <div hidden={step.kind !== 'EDITING'}>
          {slots.saved}
          <MeasurementFormBody
            studio={studio}
            flow={flow}
            isChecking={isChecking}
            problem={step.kind === 'EDITING' ? step.problem : null}
            locale={locale}
          />
        </div>
      </div>
    </div>
  );
}
