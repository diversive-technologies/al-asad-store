import { useEffect } from 'react';

import { LoadingNotice } from '@/components/shared/LoadingNotice';
import { OnDemand } from '@/components/shared/OnDemand';
import { OnDemandFailure } from '@/components/shared/OnDemandFailure';
import { Button } from '@/components/ui/button';
import { onDemandPart } from '@/hooks/use-on-demand';
import type { Locale } from '@/i18n/locales';
import { useMessages } from '@/i18n/use-messages';
import type { MeasurementPointId } from '@/lib/domain/ids';

import type { UseProfileSaveResult } from '../hooks/use-profile-save';
import { styleLabelOf, type StudioSet, type StyleChoice } from '../lib/studio-set';

/*
 * Deliberate code split (IMP-01a, PERF-06, PERF-10): the review and the
 * confirmation — every figure's table, the save, and for a product the bag's
 * own Add to bag — are drawn only after a check has passed, and a visit that
 * never checks never needs them. They are fetched while a check is in flight
 * (see the effect below), so they are normally here before its answer is.
 * Never drawn on the server: a page always opens on the fields.
 *
 * A download that fails says so where the review would be, with a way back to
 * the fields — which stay mounted in the panel, so no figure is lost. It used
 * to be thrown, and the route's error page took every figure typed with it.
 */
const review = onDemandPart(() => import('./MeasurementReview'));
const saved = onDemandPart(() => import('./MeasurementSaved'));
const tailoredAdd = onDemandPart(() => import('./TailoredAddToBag'));

interface BackToFieldsProps {
  readonly onRetry: () => void;
  readonly onBack: () => void;
}

/* The failure notice, with the way back to the fields beside Try again. */
function BackToFields({ onRetry, onBack }: BackToFieldsProps) {
  const t = useMessages().madeToMeasure;

  return (
    <OnDemandFailure onRetry={onRetry}>
      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        {t.backToForm}
      </Button>
    </OnDemandFailure>
  );
}

export interface MeasurementOutcomeProps {
  readonly studio: StudioSet;
  readonly choice: StyleChoice;
  readonly saving: UseProfileSaveResult;
  /** From the review back to the fields — to one of them, or to the first. */
  readonly onChange: (id: MeasurementPointId | null) => void;
  readonly locale: Locale;
}

/**
 * What a passed check puts in the panel — the review of every figure, then the
 * saved confirmation — and nothing while the fields are the step on screen.
 */
export function MeasurementOutcome({
  studio,
  choice,
  saving,
  onChange,
  locale,
}: MeasurementOutcomeProps) {
  const { step } = saving;
  const { product } = choice;
  const isChecking = step.kind === 'EDITING' && step.isChecking;

  // A check in flight is the moment to fetch what a passed check shows.
  useEffect(() => {
    if (!isChecking) return;
    review.warm();
    saved.warm();
    if (product !== null) tailoredAdd.warm();
  }, [isChecking, product]);

  const backToFields = (retry: () => void) => (
    <BackToFields onRetry={retry} onBack={() => onChange(null)} />
  );

  if (step.kind === 'REVIEWING') {
    return (
      <OnDemand part={review} loading={<LoadingNotice />} failure={backToFields}>
        {(module) => (
          <module.MeasurementReview
            studio={studio}
            step={step}
            onSave={saving.save}
            onChange={onChange}
            locale={locale}
          />
        )}
      </OnDemand>
    );
  }

  if (step.kind !== 'SAVED') return null;

  return (
    <OnDemand part={saved} loading={<LoadingNotice />} failure={backToFields}>
      {(module) => (
        <module.MeasurementSaved
          profile={step.profile}
          replaced={step.replaced}
          /* The saved profile's own style, by the name the chooser gives it. */
          styleLabel={styleLabelOf(choice.options, step.profile.garmentStyle)}
          bag={
            product === null ? null : (
              <OnDemand part={tailoredAdd}>
                {(add) => <add.TailoredAddToBag product={product} profile={step.profile} />}
              </OnDemand>
            )
          }
          onMeasureAgain={() => {
            onChange(null);
          }}
        />
      )}
    </OnDemand>
  );
}
