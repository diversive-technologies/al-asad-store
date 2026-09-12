import { useEffect, useId, useRef } from 'react';

import { Button, ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { useMessages } from '@/i18n/use-messages';
import { formatTemplate } from '@/lib/utils/format';

import type { MeasurementProfile } from '../schemas/profile.schema';

export interface MeasurementSavedProps {
  readonly profile: MeasurementProfile;
  /** The saved style's name, as the chooser shows it. */
  readonly styleLabel: string;
  readonly onMeasureAgain: () => void;
}

/**
 * The confirmation says what was saved, whether it replaced an earlier save
 * (§34.4: every save is a new version, kept — the customer is spared the word),
 * and where it is kept: with an account, or for this browser only. It promises
 * nothing more — there is no order behind it yet, and no way to read it back.
 */
export function MeasurementSaved({ profile, styleLabel, onMeasureAgain }: MeasurementSavedProps) {
  const t = useMessages().madeToMeasure;
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section aria-labelledby={titleId} className="mm-review">
      <h2 id={titleId} ref={headingRef} tabIndex={-1} className="mm-review-title">
        {t.savedTitle}
      </h2>
      <p className="mm-lead">
        {formatTemplate(profile.version === 1 ? t.savedFirst : t.savedReplaced, {
          style: styleLabel,
        })}
      </p>
      <p className="text-fg-muted text-sm">
        {profile.keptWith === 'ACCOUNT' ? t.savedAccount : t.savedDevice}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <ButtonLink href={ROUTES.catalogue.list} size="lg">
          {t.savedOnward}
        </ButtonLink>
        <Button type="button" variant="ghost" onClick={onMeasureAgain}>
          {t.measureAgain}
        </Button>
      </div>
    </section>
  );
}
