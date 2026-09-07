import type { Metadata } from 'next';

import Link from 'next/link';

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
 * Client Component because the list lives in the browser's own storage until
 * M6 gives it an account to belong to — see `WishlistScreen`.
 */
export default async function WishlistPage() {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  const t = messages.wishlist;

  return (
    <div className="page-shell py-10">
      {/* Section 30.5 asks for breadcrumbs; A11Y-01 makes them a real nav. */}
      <nav aria-label={t.title} className="text-fg-muted mb-4 text-sm">
        <ol className="flex items-center gap-2">
          <li>
            <Link href={ROUTES.home} className="hover:text-fg">
              {messages.catalogue.breadcrumbHome}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-fg">{t.title}</li>
        </ol>
      </nav>

      <h1 className="text-fg mb-6 text-2xl font-semibold">{t.title}</h1>

      {/* A11Y-01: the saved items are this page's main content, and say so. */}
      <main>
        <WishlistScreen locale={locale} messages={messages} />
      </main>
    </div>
  );
}
