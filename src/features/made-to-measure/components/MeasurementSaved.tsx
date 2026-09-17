import { useEffect, useId, useRef, type ReactNode } from 'react';

import { Button, ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { useMessages } from '@/i18n/use-messages';
import { formatTemplate } from '@/lib/utils/format';

import type { MeasurementProfile } from '../schemas/profile.schema';

export interface MeasurementSavedProps {
  readonly profile: MeasurementProfile;
  /** Whether this save superseded earlier figures — the server's answer. */
  readonly replaced: boolean;
  /** The saved style's name, as the chooser shows it. */
  readonly styleLabel: string;
  /**
   * The way into the bag when the studio was opened FROM a product, and nothing
   * when it was not.
   *
   * A SLOT rather than a product prop, for the same reason the panel takes the
   * saved-measurements offer as one: the bag belongs to another feature, and
   * what this screen owns is where on it the button goes — first in the row,
   * because for somebody who came from a product it is the whole point.
   */
  readonly bag: ReactNode;
  readonly onMeasureAgain: () => void;
}

/**
 * The confirmation says what was saved, whether it replaced earlier figures (the
 * server's `replaced`: a save of figures already on file replaces nothing, so the
 * version number cannot say it — and the customer is spared the word), and where
 * it is kept: with an account, or for this browser only.
 *
 * When a product sent the customer here it also offers the bag, and that is the
 * only promise it makes beyond the save itself.
 */
export function MeasurementSaved({
  profile,
  replaced,
  styleLabel,
  bag,
  onMeasureAgain,
}: MeasurementSavedProps) {
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
        {formatTemplate(replaced ? t.savedReplaced : t.savedFirst, {
          style: styleLabel,
        })}
      </p>
      <p className="text-fg-muted text-sm">
        {profile.keptWith === 'ACCOUNT' ? t.savedAccount : t.savedDevice}
      </p>
      {bag}

      <div className="flex flex-wrap items-center gap-3">
        {/* Not `lg` beside the bag button, which is `lg` itself: two large
            buttons side by side make neither the next thing to do. */}
        <ButtonLink href={ROUTES.catalogue.list} size={bag === null ? 'lg' : 'md'}>
          {t.savedOnward}
        </ButtonLink>
        <Button type="button" variant="ghost" onClick={onMeasureAgain}>
          {t.measureAgain}
        </Button>
        {/* The only way a GUEST reaches their account page: they have no menu in
            the bar, and what they just saved is theirs to find again. */}
        <ButtonLink href={ROUTES.account} variant="ghost">
          {t.savedSeeAll}
        </ButtonLink>
      </div>
    </section>
  );
}
