import type { Metadata } from 'next';

import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { ROUTES } from '@/config/routes';
import { AccountIdentity, readSession } from '@/features/auth';
import { AccountAddresses } from '@/features/addresses';
import { AccountOrders } from '@/features/checkout';
import { AccountMeasurements } from '@/features/made-to-measure';
import { AccountSavedSizes } from '@/features/saved-sizes';
import { AccountSavedItems } from '@/features/wishlist';
import { getMessages } from '@/i18n';

export interface AccountPageProps {
  /** NEXT-03 — a Promise in Next.js 16. Only the order history reads it. */
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

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
 * the feature that owns its data — identity from `auth`, orders from
 * `checkout`, addresses from `addresses`, sizes from `saved-sizes`, saved items
 * from `wishlist`, measurements from `made-to-measure` — so none of them knows
 * about the others and the page knows about none of their internals (MOD-01).
 *
 * A GUEST gets the page too, reduced: measurements save against a device token
 * before anyone signs in, so a page that refused them would hide a customer's own
 * figures behind a sign-in they were never asked for.
 */
export default async function AccountPage({ searchParams }: AccountPageProps) {
  const [messages, session, { orders, ordersAfter }] = await Promise.all([
    getMessages(),
    readSession(),
    searchParams,
  ]);
  const t = messages.account;

  return (
    <div className="page-shell py-10">
      <Breadcrumbs
        label={messages.common.breadcrumbLabel}
        steps={[
          { label: messages.catalogue.breadcrumbHome, href: ROUTES.home },
          { label: t.title },
        ]}
      />

      <h1 className="text-fg mb-6 text-2xl font-semibold">{t.title}</h1>

      {/* A11Y-01: a `div`, because the root layout's `<main>` already holds this page. */}
      <div className="max-w-3xl">
        <AccountIdentity session={session} messages={messages} />
        <AccountOrders searchParams={{ orders, ordersAfter }} />
        <AccountAddresses />
        <AccountSavedSizes />
        <AccountSavedItems />
        <AccountMeasurements isSignedIn={session !== null} />
      </div>
    </div>
  );
}
