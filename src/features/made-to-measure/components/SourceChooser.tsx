import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';
import { useMessages } from '@/i18n/use-messages';
import { formatTemplate } from '@/lib/utils/format';

import type { StudioSet } from '../lib/studio-set';
import type { CaptureSource } from '../schemas/measurement-set.schema';
import { ChoiceStrip } from './ChoiceStrip';

/** A way of measuring, by the name the page gives it. */
export function pathNameOf(source: CaptureSource, t: Messages['madeToMeasure']): string {
  return source === 'TAILOR_CARD' ? t.sourceCard : t.sourceGarment;
}

export interface SourceChooserProps {
  readonly studio: Pick<StudioSet, 'garmentStyle' | 'source' | 'sources'>;
  /** The way of measuring the address asked for, if any. */
  readonly requested: CaptureSource | null;
  /**
   * The product being measured for, if any — carried on every path, so changing
   * how the figures are taken does not lose the garment they are for.
   */
  readonly product: string | null;
}

/**
 * How the figures are being taken — copying a garment owned, or a tailor's card —
 * offered when the style can be measured both ways (plan Phase 4), as links like
 * the style (`ChoiceStrip`). Each path keeps its own figures: their points have
 * their own ids, so a switch never turns a card's half into a garment's whole.
 *
 * A path asked for but not offered is SAID, by comparing what was asked with what
 * was served — never inferred from how the backend answered — and in the paths'
 * own names, so the sentence holds whichever way round the fallback went.
 */
export function SourceChooser({ studio, requested, product }: SourceChooserProps) {
  const t = useMessages().madeToMeasure;
  const isChoice = studio.sources.length > 1;
  const missing = requested !== null && requested !== studio.source ? requested : null;

  if (!isChoice && missing === null) return null;

  return (
    <div className="mm-styles">
      {!isChoice ? null : (
        <ChoiceStrip
          label={t.sourceLabel}
          hint={t.sourceHint}
          items={studio.sources.map((source) => ({
            key: source,
            href: ROUTES.stitchedWith({ style: studio.garmentStyle, source, product }),
            label: pathNameOf(source, t),
            isCurrent: source === studio.source,
          }))}
        />
      )}

      {missing === null ? null : (
        <p className="text-fg text-sm">
          {formatTemplate(t.sourceFallback, {
            requested: pathNameOf(missing, t),
            served: pathNameOf(studio.source, t),
          })}
        </p>
      )}
    </div>
  );
}
