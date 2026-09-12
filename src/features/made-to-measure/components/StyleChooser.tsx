import { ROUTES } from '@/config/routes';
import { useMessages } from '@/i18n/use-messages';
import type { GarmentStyleId } from '@/lib/domain/ids';
import { formatTemplate } from '@/lib/utils/format';

import type { StyleChoice } from '../lib/studio-set';
import type { CaptureSource } from '../schemas/measurement-set.schema';
import { ChoiceStrip } from './ChoiceStrip';

export interface StyleChooserProps {
  readonly choice: StyleChoice;
  readonly current: GarmentStyleId;
  /**
   * The way of measuring the customer CHOSE — carried to every style, and served
   * where the style offers it. A style without it shows its first path and says
   * so, and coming back restores the choice.
   */
  readonly source: CaptureSource;
}

/**
 * Which style is being measured for — a LINK per style (`ChoiceStrip`):
 * `/stitched?style=WAISTCOAT_SUIT` is what the product page's fork opens. The line
 * under the choice says the figures typed survive a switch, because otherwise
 * someone with eight figures typed does not dare to press it.
 */
export function StyleChooser({ choice, current, source }: StyleChooserProps) {
  const t = useMessages().madeToMeasure;
  const currentLabel = choice.options.find((style) => style.garmentStyle === current)?.label;
  const isChoice = choice.options.length > 1;

  if (!isChoice && !choice.fellBack) return null;

  return (
    <div className="mm-styles">
      {!isChoice ? null : (
        <ChoiceStrip
          label={t.styleLabel}
          hint={t.styleHint}
          items={choice.options.map((style) => ({
            key: style.garmentStyle,
            href: ROUTES.stitchedWith({ style: style.garmentStyle, source }),
            label: style.label,
            isCurrent: style.garmentStyle === current,
          }))}
        />
      )}

      {choice.fellBack && currentLabel !== undefined ? (
        <p className="text-fg text-sm">{formatTemplate(t.styleFallback, { style: currentLabel })}</p>
      ) : null}
    </div>
  );
}
