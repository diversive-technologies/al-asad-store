import type { Metadata } from 'next';

import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { ROUTES } from '@/config/routes';
import { WishlistScreen } from '@/features/wishlist';
import { getLocale, getMessages } from '@/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  /*
   * §30.5 — a saved list is per-customer and holds nothing an index could use.
   * `follow` stays on so the products linked from it are still reachable.
   */
  return { title: messages.wishlist.title, robots: { index: false, follow: true } };
}

/**
 * §28.3's saved items, at their own address.
 *
 * STRUCT-02: the route composes and does not implement. Everything below is a
 * Client Component because it renders the catalogue's own client card and reads
 * the list through the BFF the heart writes to — see `WishlistScreen`. The list
 * itself belongs to the account and follows the customer between devices.
 */
export default async function WishlistPage() {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  const t = messages.wishlist;

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

      {/* A11Y-01: no second `<main>` — the root layout's already holds this page. */}
      <WishlistScreen locale={locale} messages={messages} />
    </div>
  );
}
