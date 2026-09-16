import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { getLocale, getMessages } from '@/i18n';

import { loadSavedMeasurements } from '../api/load-saved-measurements';
import { SavedProfileCard } from './SavedProfileCard';

export interface AccountMeasurementsProps {
  /** A guest's measurements are held against this browser, and the page says so. */
  readonly isSignedIn: boolean;
}

/**
 * §34 — the measurements section of the account, for a customer or a guest.
 *
 * It reads its own data rather than taking it as a prop, so the account route
 * composes without knowing what a measurement profile is (STRUCT-02, MOD-01):
 * the feature that owns the record owns the words and the reads for it.
 *
 * A guest is shown the same thing a signed-in customer is, because a guest's
 * measurements are just as real — with one line saying where they are kept. That
 * is the honest version: this browser holds them, and signing in does not move
 * them yet.
 */
export async function AccountMeasurements({ isSignedIn }: AccountMeasurementsProps) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  const t = messages.account;
  const saved = await loadSavedMeasurements(locale);

  return (
    <section aria-labelledby="account-measurements" className="mt-10">
      <h2 id="account-measurements" className="text-fg text-lg font-medium">
        {t.measurementsHeading}
      </h2>

      {saved.unreadable === null ? null : (
        <p className="text-fg-muted mt-2">
          {saved.unreadable === 'RECORD' ? t.measurementsUnreadable : t.measurementsUnavailable}
        </p>
      )}

      {saved.unreadable === null && saved.views.length === 0 ? (
        <div className="mt-2 flex flex-col items-start gap-3">
          <p className="text-fg-muted">{t.measurementsEmpty}</p>
          <ButtonLink href={ROUTES.stitched} variant="secondary">
            {t.measurementsEmptyCta}
          </ButtonLink>
        </div>
      ) : null}

      {saved.views.length === 0 ? null : (
        <>
          {isSignedIn ? null : <p className="text-fg-muted mt-2 text-sm">{t.keptOnThisBrowser}</p>}
          <div className="mt-4 flex flex-col gap-4">
            {saved.views.map((view) => (
              <SavedProfileCard
                key={view.profile.id}
                view={view}
                locale={locale}
                messages={messages}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
