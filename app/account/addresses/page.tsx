import type { Metadata } from 'next';

import Link from 'next/link';

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
      {/* §30.5 asks for breadcrumbs; A11Y-01 makes them a real nav. */}
      <nav aria-label={t.addressesHeading} className="text-fg-muted mb-4 text-sm">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <Link href={ROUTES.home} className="hover:text-fg py-2">
              {messages.catalogue.breadcrumbHome}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={ROUTES.account} className="hover:text-fg py-2">
              {t.title}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-fg">{t.addressesHeading}</li>
        </ol>
      </nav>

      <h1 className="text-fg mb-2 text-2xl font-semibold">{t.addressesHeading}</h1>
      <p className="text-fg-muted mb-6 max-w-2xl text-sm">{t.addressesLead}</p>

      <main className="max-w-2xl">
        <AddressBookScreen messages={messages} />
      </main>
    </div>
  );
}
