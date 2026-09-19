import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';

export interface AddressBookSignedOutProps {
  messages: Messages;
}

/**
 * The address book for somebody not signed in: §2.1 gives saved addresses to the
 * Customer and withholds them from the Visitor, so this says so and offers the way
 * in — which comes back to this page once they are signed in.
 */
export function AddressBookSignedOut({ messages }: AddressBookSignedOutProps) {
  const t = messages.account;

  return (
    <div className="flex flex-col items-start gap-3 py-16">
      <h2 className="text-fg text-lg font-medium">{t.addressesGuestHeading}</h2>
      <p className="text-fg-muted">{t.addressesGuestBody}</p>
      <ButtonLink href={ROUTES.signInFrom(ROUTES.accountAddresses)} variant="primary">
        {messages.auth.signInCta}
      </ButtonLink>
    </div>
  );
}
