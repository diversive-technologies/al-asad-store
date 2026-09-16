import type { Metadata } from 'next';

import Link from 'next/link';

import { ROUTES } from '@/config/routes';
import { AccountIdentity, readSession } from '@/features/auth';
import { AccountMeasurements } from '@/features/made-to-measure';
import { AccountSavedItems } from '@/features/wishlist';
import { getMessages } from '@/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  /* §30.5 — an account page is one customer's own and holds nothing an index
     could use. `follow` stays on, so what it links to is still reachable. */
  return { title: messages.account.title, robots: { index: false, follow: true } };
}

/**
 * The account area (§28.3), for a customer or a guest.
 *
 * STRUCT-02: the route composes and does not implement. Each section comes from
 * the feature that owns its data — identity from `auth`, saved items from
 * `wishlist`, measurements from `made-to-measure` — so none of them knows about
 * the others and the page knows about none of their internals (MOD-01).
 *
 * A GUEST gets the page too, reduced: measurements save against a device token
 * before anyone signs in, so a page that refused them would hide a customer's own
 * figures behind a sign-in they were never asked for.
 */
export default async function AccountPage() {
  const [messages, session] = await Promise.all([getMessages(), readSession()]);
  const t = messages.account;

  return (
    <div className="page-shell py-10">
      {/* §30.5 asks for breadcrumbs; A11Y-01 makes them a real nav. */}
      <nav aria-label={t.title} className="text-fg-muted mb-4 text-sm">
        <ol className="flex items-center gap-2">
          <li>
            <Link href={ROUTES.home} className="hover:text-fg py-2">
              {messages.catalogue.breadcrumbHome}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-fg">{t.title}</li>
        </ol>
      </nav>

      <h1 className="text-fg mb-6 text-2xl font-semibold">{t.title}</h1>

      <main className="max-w-3xl">
        <AccountIdentity session={session} messages={messages} />
        <AccountSavedItems />
        <AccountMeasurements isSignedIn={session !== null} />
      </main>
    </div>
  );
}
