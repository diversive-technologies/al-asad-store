import { ErrorState } from '@/components/shared/ErrorState';
import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';

export interface StudioUnavailableProps {
  /** The address that failed, so asking again asks for the same list. */
  readonly retryHref: string;
  readonly messages: Messages;
}

/**
 * The studio's own error state. It still names the page, says what went wrong
 * without guessing why — the cause may be a network, or content the backend
 * cannot serve in this language — and offers the two ways on: ask again, or buy
 * in a standard size, which §34.7 says is never taken away.
 */
export function StudioUnavailable({ retryHref, messages }: StudioUnavailableProps) {
  const t = messages.madeToMeasure;

  return (
    <div className="page-shell my-16">
      <div className="flex max-w-2xl flex-col gap-6">
        <h1 className="mm-title">{t.pageTitle}</h1>
        <ErrorState message={t.unavailable} />
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={retryHref} variant="secondary">
            {messages.common.retry}
          </ButtonLink>
          <ButtonLink href={ROUTES.catalogue.list} variant="ghost">
            {t.browseStandard}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
