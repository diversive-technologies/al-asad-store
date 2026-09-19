import type { Metadata } from 'next';

import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { AddressBookScreen } from '@/features/addresses/contract';
import { ROUTES } from '@/config/routes';
import { getMessages } from '@/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  /* §30.5 — one customer's own addresses, with nothing an index could use.
     `follow` stays on, so what it links to is still reachable. */
  return { title: messages.account.addressesHeading, robots: { index: false, follow: true } };
}

/**
 * §28.3's address book, at its own address.
 *
 * STRUCT-02: the route composes and does not implement. It is a page of its own
 * rather than a section of `/account` because it WRITES — and keeping the form
 * here is what leaves `/account` shipping no JavaScript at all.
 */
export default async function AccountAddressesPage() {
  const messages = await getMessages();
  const t = messages.account;

  return (
    <div className="page-shell py-10">
      <Breadcrumbs
        label={messages.common.breadcrumbLabel}
        steps={[
          { label: messages.catalogue.breadcrumbHome, href: ROUTES.home },
          { label: t.title, href: ROUTES.account },
          { label: t.addressesHeading },
        ]}
      />

      <h1 className="text-fg mb-2 text-2xl font-semibold">{t.addressesHeading}</h1>
      <p className="text-fg-muted mb-6 max-w-2xl text-sm">{t.addressesLead}</p>

      {/* A11Y-01: a `div`, because the root layout's `<main>` already holds this page. */}
      <div className="max-w-2xl">
        <AddressBookScreen messages={messages} />
      </div>
    </div>
  );
}
