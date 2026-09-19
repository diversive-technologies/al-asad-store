import type { ReactNode } from 'react';

import type { Metadata } from 'next';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { SkipLink } from '@/components/layout/SkipLink';
import { CLIENT } from '@/config/client';
import { fontVariables } from '@/config/fonts';
import { SITE } from '@/config/site';
import { BagPanel, BagProvider, BagTrigger } from '@/features/bag/contract';
import { SavedItemsProvider } from '@/features/wishlist/contract';
import { HeaderSearch } from '@/features/catalogue';
import { AccountMenu, readSession, SessionProvider } from '@/features/auth';
import { LocaleSwitcher } from '@/features/localisation';
import { NewsletterSignup } from '@/features/newsletter';
import { ThemeProvider } from '@/hooks/use-theme';
import { getLocale, getMessages } from '@/i18n';
import { DIRECTION, localeSwitchPlace } from '@/i18n/locales';
import { MessagesProvider } from '@/i18n/use-messages';
import { cn } from '@/lib/utils/cn';
import { ensureMockServer } from '@/lib/mocks/ensure';
import { getThemePreference } from '@/lib/theme.server';
import { QueryProvider } from '@/providers/query-provider';

import '@/styles/globals.css';

/** A11Y-02: the skip link's destination, referenced in exactly one other place. */
const MAIN_CONTENT_ID = 'main-content';

/**
 * NEXT-11 — metadata is exported, not injected.
 *
 * It is generated rather than static because the store's name is translated:
 * a static template would title every Urdu page with the English brand.
 *
 * There are NO alternates here, and that is the fix for a real defect: every
 * route inherits a field it does not set, so `canonical: '/'` in this file told
 * search engines that every product, listing and help page was a copy of the
 * homepage. §30.5's canonical and cross-linked locales are per page — each
 * indexable page states its own through `localeAlternates`.
 */
export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();

  return {
    metadataBase: SITE.metadataBase,
    title: { default: messages.site.name, template: `%s · ${messages.site.name}` },
    description: messages.site.tagline,
  };
}

export interface RootLayoutProps {
  children: ReactNode;
}

/**
 * I18N-03 — the ONLY place direction is decided. Components never read the
 * locale to flip themselves.
 *
 * MOD-01 — this file sits above both `components/` and `features/`, so it is
 * where the two are composed: the shell receives the search field, the bag, the
 * account menu, the locale switcher and the newsletter form as slots rather than
 * importing them itself.
 *
 * What each layer is for:
 *
 * - `data-theme` stamps a stored choice so the first paint is already in the
 *   right scheme. Its absence is meaningful — no attribute means "follow the
 *   operating system", which globals.css handles with a media query — so there
 *   is no flash and no blocking inline script.
 * - D3 — the session is read on the server because its cookie is httpOnly. It
 *   gates what is OFFERED (the wishlist heart); the backend still decides what
 *   is allowed (SEC-03).
 * - The bag wraps everything below the query client, because both the header's
 *   count and a product page's Add to bag read the same cart. It holds one
 *   boolean and the query handle; the contents stay in TanStack Query (STATE-02).
 * - §28.3 — `SavedItemsProvider` is mounted once, above the routes, because the
 *   list a customer built before signing in has to be handed to their account
 *   wherever they land afterwards. It renders nothing.
 * - D5 — the locale switcher needs more than one locale to EXIST and the client
 *   to want the control offered (`features.languageSwitcher`) — and a visitor
 *   already reading another language is offered the way back at the foot of the
 *   page even when it does not (`localeSwitchPlace`); the newsletter is an
 *   optional feature, so its slot is empty when it is off.
 * - The bar is fixed and occupies no layout space, so `<main>` clears it for
 *   every page by default; a full-bleed section such as the hero opts out with a
 *   matching negative margin.
 * - The bag panel is mounted once, above the routes: one dialog, one top layer.
 */
export default async function RootLayout({ children }: RootLayoutProps) {
  // D1: re-arms the mock layer for this module context; a no-op once armed.
  await ensureMockServer();

  // PERF-02: independent reads run in parallel, never as a waterfall.
  const [locale, messages, themePreference, session] = await Promise.all([
    getLocale(),
    getMessages(),
    getThemePreference(),
    readSession(),
  ]);

  const switchPlace = localeSwitchPlace(locale, CLIENT.features.languageSwitcher);
  const localeSwitcher = <LocaleSwitcher currentLocale={locale} />;

  return (
    <html
      lang={locale}
      dir={DIRECTION[locale]}
      data-theme={themePreference ?? undefined}
      className={cn(fontVariables)}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col antialiased">
        <QueryProvider>
          <ThemeProvider initialPreference={themePreference}>
            <MessagesProvider value={messages}>
              <SessionProvider session={session}>
                <BagProvider>
                  <SavedItemsProvider>
                    <SkipLink label={messages.nav.skipToContent} targetId={MAIN_CONTENT_ID} />
                    <Header
                      messages={messages}
                      localeSwitcher={switchPlace === 'HEADER' ? localeSwitcher : null}
                      search={<HeaderSearch locale={locale} messages={messages} />}
                      bagTrigger={<BagTrigger locale={locale} messages={messages} />}
                      accountMenu={<AccountMenu messages={messages} />}
                    />
                    <main id={MAIN_CONTENT_ID} className="pt-header flex-1">
                      {children}
                    </main>
                    <Footer
                      messages={messages}
                      newsletter={CLIENT.features.newsletter ? <NewsletterSignup /> : null}
                      localeSwitcher={switchPlace === 'FOOTER' ? localeSwitcher : null}
                    />
                    <BagPanel locale={locale} messages={messages} />
                  </SavedItemsProvider>
                </BagProvider>
              </SessionProvider>
            </MessagesProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
