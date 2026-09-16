import { useId } from 'react';

import { Button } from '@/components/ui/button';
import type { Locale } from '@/i18n/locales';
import { useMessages } from '@/i18n/use-messages';
import { formatDate, formatList, formatNumber, formatTemplate } from '@/lib/utils/format';

import type { SavedOffer } from '../lib/saved-figures';
import { styleLabelOf, type StudioSet, type StyleOption } from '../lib/studio-set';

export interface SavedMeasurementsProps {
  readonly offer: SavedOffer;
  readonly taken: boolean;
  readonly onTake: () => void;
  /** The served list, for the names of any measurement that could not be carried. */
  readonly studio: StudioSet;
  /** The styles on offer, which is where a style's name lives. */
  readonly styles: readonly StyleOption[];
  readonly locale: Locale;
}

/**
 * What the customer has already saved, OFFERED rather than applied.
 *
 * Nothing is filled in until the button is pressed, and the reason is the whole
 * feature: cloth is cut from these figures, so a measurement must never appear in
 * a field the customer did not put it in. Once taken, the same section says how
 * many figures landed and asks them to look — it does not claim the form is done.
 *
 * The live region is rendered from the start and left empty, because a region
 * inserted at the same moment as its text is not reliably announced (A11Y-05).
 */
export function SavedMeasurements({
  offer,
  taken,
  onTake,
  studio,
  styles,
  locale,
}: SavedMeasurementsProps) {
  const t = useMessages().madeToMeasure;
  const titleId = useId();
  const styleLabel = styleLabelOf(styles, offer.lead.garmentStyle);

  const setAside = offer.setAside.map(
    (row) => studio.points.find((point) => point.id === row.pointId)?.label ?? row.pointId,
  );

  return (
    /* `mm-saved` earns its place by being in the focus-mode hide list: on a phone
       the sheet is one field over the drawing, and furniture left in it takes the
       drawing's room and puts a button in the sheet's tab order. */
    <section
      aria-labelledby={titleId}
      className="mm-saved border-border rounded-card mb-8 border p-4"
    >
      <h2 id={titleId} className="text-fg text-sm font-medium">
        {t.reuseTitle}
      </h2>

      {taken ? null : (
        <>
          <p className="text-fg-muted mt-1 text-sm">
            {formatTemplate(t.reuseFrom, {
              date: formatDate(offer.lead.createdAt, locale),
              style: styleLabel,
            })}
          </p>
          {offer.borrowed ? <p className="text-fg-muted mt-1 text-sm">{t.reuseBorrowed}</p> : null}
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={onTake}>
              {t.reuseCta}
            </Button>
          </div>
        </>
      )}

      <p role="status" className="text-fg-muted mt-1 text-sm empty:hidden">
        {taken
          ? formatTemplate(t.reuseFilled, {
              count: formatNumber(offer.figures.length, locale),
              style: styleLabel,
            })
          : ''}
      </p>

      {taken && setAside.length > 0 ? (
        <p className="text-fg-muted mt-1 text-sm">
          {formatTemplate(t.reuseSetAside, { points: formatList(setAside, locale) })}
        </p>
      ) : null}
    </section>
  );
}
