import Link from 'next/link';

import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import { useMessages } from '@/i18n/use-messages';
import { formatNumber, formatTemplate } from '@/lib/utils/format';

import type { StudioSet, StyleChoice } from '../lib/studio-set';
import { pathNameOf, SourceChooser } from './SourceChooser';
import { StudioProductBanner } from './StudioProductBanner';
import { StyleChooser } from './StyleChooser';

export interface StudioIntroProps {
  readonly studio: StudioSet;
  readonly choice: StyleChoice;
  readonly locale: Locale;
}

/**
 * What this is, which style, and how it is being measured — above the fields,
 * the review and the confirmation alike. The lead says what the path asks: a
 * garment is measured, a card is copied. One polite status says what the list on
 * screen asks for, whichever strip changed it — silent on the first load.
 */
export function StudioIntro({ studio, choice, locale }: StudioIntroProps) {
  const messages = useMessages();
  const t = messages.madeToMeasure;
  const styleLabel = choice.options.find(
    (style) => style.garmentStyle === studio.garmentStyle,
  )?.label;
  const count = formatNumber(studio.points.length, locale);

  return (
    <>
      <nav aria-label={t.pageTitle} className="mm-crumbs">
        <Link href={ROUTES.home}>{messages.catalogue.breadcrumbHome}</Link>
        <span aria-hidden>/</span>
        <span>{t.pageTitle}</span>
      </nav>

      <h1 className="mm-title">{t.pageTitle}</h1>

      {/* Above the lead, because the lead is an instruction and this is what the
          instruction is FOR. */}
      {choice.product === null ? null : <StudioProductBanner product={choice.product} />}

      <p className="mm-lead">{studio.source === 'TAILOR_CARD' ? t.pageLeadCard : t.pageLead}</p>

      {/* The customer's chosen path travels with every style, served or not. */}
      <StyleChooser
        choice={choice}
        current={studio.garmentStyle}
        source={choice.requestedSource ?? studio.source}
      />
      <SourceChooser
        studio={studio}
        requested={choice.requestedSource}
        product={choice.product?.slug ?? null}
      />

      {styleLabel === undefined ? null : (
        <p role="status" className="sr-only">
          {studio.sources.length > 1
            ? formatTemplate(t.styleNowPath, {
                style: styleLabel,
                path: pathNameOf(studio.source, t),
                count,
              })
            : formatTemplate(t.styleNow, { style: styleLabel, count })}
        </p>
      )}
    </>
  );
}
