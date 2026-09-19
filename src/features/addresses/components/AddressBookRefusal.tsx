import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';

import type { AddressBookError } from '../api/addresses-browser';
import { addressRefusal } from '../lib/address-refusal';

export interface AddressBookRefusalProps {
  /** Why the last change was refused, or `null` when nothing was. */
  failure: AddressBookError['kind'] | null;
  messages: Messages;
}

/**
 * Why the book refused a change, said beside the book rather than instead of it.
 *
 * A11Y-05 / ERR-04 — announced, not only shown. A session that has ENDED also
 * offers the way back in, and to this page: telling somebody to sign in again
 * with nothing to press sends them hunting for a link the header does not show,
 * since it still believes the session it was rendered with.
 */
export function AddressBookRefusal({ failure, messages }: AddressBookRefusalProps) {
  return (
    <>
      <p role="alert" className="text-danger-500 text-sm empty:hidden">
        {failure === null ? null : addressRefusal(failure, messages.account)}
      </p>
      {failure === 'SIGNED_OUT' ? (
        <div>
          <ButtonLink href={ROUTES.signInFrom(ROUTES.accountAddresses)} variant="secondary">
            {messages.auth.signInCta}
          </ButtonLink>
        </div>
      ) : null}
    </>
  );
}
