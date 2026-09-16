import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { currentAccountKey } from '@/features/auth/server';
import { getMessages } from '@/i18n';

import { fetchAddresses } from '../api/addresses-server';

/**
 * §28.3 — the addresses section of the account.
 *
 * It reads its own book rather than taking it as a prop, so the account route
 * composes without knowing what an address is (STRUCT-02, MOD-01), and it reads
 * it on the SERVER, so this section ships no JavaScript and `/account` still
 * has no client boundary of its own. The managing is a page away, where a form
 * can live.
 *
 * It shows the DEFAULT one, because that is the answer to the question somebody
 * opening this page has — where will my next order go — and the rest is one
 * click behind it.
 *
 * A GUEST has no book: §2.1 gives saved addresses to the Customer and withholds
 * them from the Visitor.
 */
export async function AccountAddresses() {
  const messages = await getMessages();
  const t = messages.account;
  const accountKey = await currentAccountKey();
  const book = accountKey === null ? null : await fetchAddresses(accountKey);
  const addresses = book !== null && book.ok ? book.value.addresses : [];
  const standing = addresses.find((address) => address.isDefault);

  return (
    <section aria-labelledby="account-addresses" className="mt-10">
      <h2 id="account-addresses" className="text-fg text-lg font-medium">
        {t.addressesHeading}
      </h2>

      {book === null ? <p className="text-fg-muted mt-2">{t.addressesGuestBody}</p> : null}

      {/* On file and could not be READ — said as such, because reporting a
          customer's own book as empty would be a lie. */}
      {book !== null && !book.ok ? (
        <p className="text-fg-muted mt-2">{t.addressesUnavailable}</p>
      ) : null}

      {book !== null && book.ok && standing === undefined ? (
        <div className="mt-2 flex flex-col items-start gap-3">
          <p className="text-fg-muted">{t.addressesEmpty}</p>
          <ButtonLink href={ROUTES.accountAddresses} variant="secondary">
            {t.addressAddCta}
          </ButtonLink>
        </div>
      ) : null}

      {standing === undefined ? null : (
        <div className="mt-2 flex flex-col items-start gap-3">
          <p className="text-fg-muted text-sm">{t.addressDefaultLead}</p>
          {/* I18N-04 — `bdi` per line: a Pakistani address mixes scripts, and a
              Latin street name inside an Urdu paragraph reorders without it. */}
          <address className="text-fg not-italic">
            <bdi>{standing.recipientName}</bdi>
            <br />
            <bdi>{standing.line}</bdi>
            <br />
            <bdi>{standing.city}</bdi>
          </address>
          <ButtonLink href={ROUTES.accountAddresses} variant="secondary">
            {t.addressesManage}
          </ButtonLink>
        </div>
      )}
    </section>
  );
}
