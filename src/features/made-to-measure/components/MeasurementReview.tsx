import { useEffect, useId, useRef } from 'react';

import { Button } from '@/components/ui/button';
import type { Locale } from '@/i18n/locales';
import { useMessages } from '@/i18n/use-messages';
import type { MeasurementPointId } from '@/lib/domain/ids';

import { reviewGroups } from '../lib/review';
import type { StudioSet } from '../lib/studio-set';
import type { ReviewingStep } from '../lib/studio-step';
import { ReviewTable } from './ReviewTable';
import { StudioProblemNotice } from './StudioProblemNotice';

export interface MeasurementReviewProps {
  readonly studio: StudioSet;
  readonly step: ReviewingStep;
  readonly onSave: () => void;
  readonly onChange: (id: MeasurementPointId | null) => void;
  readonly locale: Locale;
}

/**
 * Every figure twice — as typed, and as it will be kept — before anything is
 * saved, with a way back to each one. A half is the number that most often goes
 * wrong, and here the customer sees "19.5 in across" become "39 in around" in one
 * row.
 */
export function MeasurementReview({ studio, step, onSave, onChange, locale }: MeasurementReviewProps) {
  const t = useMessages().madeToMeasure;
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const groups = reviewGroups(studio, step.checked);
  const anyKept = groups.some((group) => group.rows.some((row) => row.kept));

  // The fields this replaced had focus; the heading takes it, so a screen reader
  // starts at the top of what is new.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section aria-labelledby={titleId} className="mm-review">
      <h2 id={titleId} ref={headingRef} tabIndex={-1} className="mm-review-title">
        {t.reviewTitle}
      </h2>
      <p className="mm-lead">{t.reviewLead}</p>
      {anyKept ? <p className="text-fg-muted text-sm">{t.reviewKeptLead}</p> : null}

      {groups.map((group) => (
        <ReviewTable
          key={group.piece.id}
          group={group}
          isLocked={step.isSaving}
          onChange={onChange}
          source={studio.source}
          locale={locale}
        />
      ))}

      {step.problem === null ? null : <StudioProblemNotice problem={step.problem} />}

      <div className="flex flex-wrap items-center gap-3">
        {/* Busy, not disabled, so focus stays on it through a failed save. */}
        <Button type="button" size="lg" aria-busy={step.isSaving} onClick={onSave}>
          {step.isSaving ? t.saving : t.saveProfileCta}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={step.isSaving}
          onClick={() => {
            onChange(null);
          }}
        >
          {t.backToForm}
        </Button>
      </div>
    </section>
  );
}
