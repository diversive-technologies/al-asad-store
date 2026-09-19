import Link from 'next/link';

import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatDate, formatPlural, formatTemplate } from '@/lib/utils/format';

import type { SavedProfileView } from '../api/load-saved-measurements';
import { SavedFigures } from './SavedFigures';

export interface SavedProfileCardProps {
  readonly view: SavedProfileView;
  readonly locale: Locale;
  readonly messages: Messages;
}

/**
 * One saved set of measurements: what it is, when it was taken and how, every
 * figure as typed and as kept, and the way back into the studio.
 *
 * The link opens the list the figures were taken against, where the studio
 * offers them back (plan Phase 1) — so "edit" is the measuring screen the
 * customer already knows rather than a second form over the same figures.
 *
 * `mm-saved-card` names the review's own container so the table inside it
 * narrows the same way on a phone.
 */
export function SavedProfileCard({ view, locale, messages }: SavedProfileCardProps) {
  const t = messages.account;
  const studio = messages.madeToMeasure;
  const { profile } = view;
  const path = profile.source === 'TAILOR_CARD' ? studio.sourceCard : studio.sourceGarment;

  return (
    <article className="mm-saved-card border-border rounded-card border p-4">
      {/* I18N-10: the style's name is '' when this language has none, and an empty
          heading is never rendered — the card is still somebody's saved record. */}
      <h3 className="text-fg text-base font-medium">
        {view.styleLabel === '' ? t.savedMeasurementsUntitled : view.styleLabel}
      </h3>
      <p className="text-fg-muted mt-1 text-sm">
        {formatTemplate(t.savedOn, { date: formatDate(profile.createdAt, locale), path })}
      </p>

      {view.groups.length === 0 ? (
        <p className="text-fg-muted mt-3 text-sm">{t.figuresUnavailable}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {view.groups.map((group) => (
            <SavedFigures
              key={group.piece.id}
              group={group}
              source={profile.source}
              locale={locale}
              messages={messages}
            />
          ))}
        </div>
      )}

      {/* Kept rather than swallowed: the guide can change, and a customer must
          not silently be shown fewer figures than they gave us. */}
      {view.notAsked === 0 ? null : (
        <p className="text-fg-muted mt-3 text-sm">
          {formatPlural(t.figuresNotAsked, view.notAsked, locale)}
        </p>
      )}

      <p className="mt-4">
        <Link
          href={ROUTES.stitchedWith({
            style: profile.garmentStyle,
            source: profile.source,
            /* The account is not a product page: nothing is being measured FOR
               anything here, and naming a garment would be inventing one. */
            product: null,
          })}
          className="text-fg py-2 text-sm underline underline-offset-4"
        >
          {t.openMeasurements}
        </Link>
      </p>
    </article>
  );
}
