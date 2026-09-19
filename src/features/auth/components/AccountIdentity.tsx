import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';

import type { Session } from '../schemas/auth.schema';

export interface AccountIdentityProps {
  readonly session: Session | null;
  readonly messages: Messages;
}

/**
 * Who the account belongs to — or the invitation to sign in.
 *
 * Read-only, and it states the placeholder in words. D3's session cookie is
 * unsigned JSON that anyone can write, and §11 replaces it in M6; while that is
 * true, a page that looks like an account is a page people may put real details
 * into, so it says plainly that they should not. There is no sign-out here on
 * purpose: the header's menu already has one, and two would be two to keep in
 * step (PD-01).
 */
export function AccountIdentity({ session, messages }: AccountIdentityProps) {
  const t = messages.account;

  if (session === null) {
    return (
      <section aria-labelledby="account-identity" className="flex flex-col items-start gap-3">
        <h2 id="account-identity" className="text-fg text-lg font-medium">
          {t.guestHeading}
        </h2>
        <p className="text-fg-muted">{t.guestBody}</p>
        {/* Signing in comes back here, where the customer asked to (BUG-15). */}
        <ButtonLink href={ROUTES.signInFrom(ROUTES.account)} variant="primary">
          {messages.auth.signInCta}
        </ButtonLink>
      </section>
    );
  }

  return (
    <section aria-labelledby="account-identity">
      <h2 id="account-identity" className="text-fg text-lg font-medium">
        {t.detailsHeading}
      </h2>

      {/* Only what the account actually holds: a customer who signed in by code
          has no email, and an empty line would be a field pretending to be data. */}
      <dl className="text-fg-muted mt-2 flex flex-col gap-1 text-sm">
        <div className="flex flex-wrap gap-2">
          <dt className="text-fg">{t.nameLabel}</dt>
          <dd>{session.displayName}</dd>
        </div>
        {session.email.length === 0 ? null : (
          <div className="flex flex-wrap gap-2">
            <dt className="text-fg">{t.emailLabel}</dt>
            <dd>
              <bdi>{session.email}</bdi>
            </dd>
          </div>
        )}
        {session.mobile.length === 0 ? null : (
          <div className="flex flex-wrap gap-2">
            <dt className="text-fg">{t.mobileLabel}</dt>
            <dd>
              <bdi>{session.mobile}</bdi>
            </dd>
          </div>
        )}
      </dl>

      <p className="text-fg-muted mt-3 text-sm">{t.detailsPlaceholder}</p>
    </section>
  );
}
