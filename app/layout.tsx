import type { ReactNode } from 'react';

import type { Metadata } from 'next';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { SkipLink } from '@/components/layout/SkipLink';
import { CLIENT } from '@/config/client';
import { fontVariables } from '@/config/fonts';
import { SITE } from '@/config/site';
import { BagPanel, BagProvider, BagTrigger } from '@/features/bag/contract';
import { HeaderSearch } from '@/features/catalogue';
import { AccountMenu, readSession, SessionProvider } from '@/features/auth';
import { LocaleSwitcher } from '@/features/localisation';
import { NewsletterForm } from '@/features/newsletter';
import { ThemeProvider } from '@/hooks/use-theme';
import { getLocale, getMessages } from '@/i18n';
import { DIRECTION, LOCALES } from '@/i18n/locales';
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
 * Section 30.5 requires both locales to be published, declared and
 * cross-linked, so the alternates are emitted here — once, for every route —
 * rather than being remembered per page.
 */
export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();

  return {
    metadataBase: SITE.metadataBase,
    title: { default: messages.site.name, template: `%s · ${messages.site.name}` },
    description: messages.site.tagline,
    alternates: {
      canonical: '/',
      languages: Object.fromEntries(LOCALES.map((code) => [code, `/?locale=${code}`])),
    },
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
 * where the two are composed: the shell receives the locale switcher and the
 * newsletter form as slots rather than importing them itself.
 */
export default async function RootLayout({ children }: RootLayoutProps) {
  // D1: re-arms the mock layer for this module context. No-op once armed, and
  // no-op entirely once the Java service is live.
  await ensureMockServer();

  // PERF-02: independent reads run in parallel, never as a waterfall.
  const [locale, messages, themePreference, session] = await Promise.all([
    getLocale(),
    getMessages(),
    getThemePreference(),
    readSession(),
  ]);

  return (
    <html
      lang={locale}
      dir={DIRECTION[locale]}
      /*
       * A stored choice is stamped here so the first paint is already in the
       * right scheme. Its absence is meaningful: no attribute means "follow the
       * operating system", which globals.css handles with a media query — so
       * there is no flash and no blocking inline script.
       */
      data-theme={themePreference ?? undefined}
      className={cn(fontVariables)}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col antialiased">
        <QueryProvider>
          <ThemeProvider initialPreference={themePreference}>
            <MessagesProvider value={messages}>
              {/*
               * D3 — the session, read on the server because its cookie is
               * httpOnly. It gates what is OFFERED (the wishlist heart today);
               * the backend still decides what is allowed (SEC-03).
               */}
              <SessionProvider session={session}>
                {/*
                 * The bag wraps everything below the query client, because both
                 * the header's count and a product page's Add to bag read the
                 * same cart. It holds one boolean and the query handle — the
                 * contents are server state and stay in TanStack Query (STATE-02).
                 */}
                <BagProvider>
                  <SkipLink label={messages.nav.skipToContent} targetId={MAIN_CONTENT_ID} />

                  <Header
                    messages={messages}
                    /*
                     * Derived, not flagged: a client with one language has nothing
                     * to switch to, and a separate flag could contradict LOCALES.
                     */
                    localeSwitcher={
                      /* D5: two conditions, and they mean different things. More
                     than one locale must EXIST, and the client must want the
                     control offered — see `features.languageSwitcher`. */
                      LOCALES.length > 1 && CLIENT.features.languageSwitcher ? (
                        <LocaleSwitcher currentLocale={locale} />
                      ) : null
                    }
                    search={<HeaderSearch locale={locale} messages={messages} />}
                    bagTrigger={<BagTrigger messages={messages} />}
                    accountMenu={<AccountMenu messages={messages} />}
                  />

                  {/*
                   * The bar is fixed, so it occupies no layout space. Padding here
                   * clears it for every page by default; a full-bleed section such
                   * as the hero opts out with a matching negative margin.
                   */}
                  <main id={MAIN_CONTENT_ID} className="pt-header flex-1">
                    {children}
                  </main>

                  <Footer
                    messages={messages}
                    /* D5: an optional feature, so the slot is empty when it is off. */
                    newsletter={CLIENT.features.newsletter ? <NewsletterForm /> : null}
                  />

                  {/* Mounted once, above the routes: one dialog, one top layer. */}
                  <BagPanel locale={locale} messages={messages} />
                </BagProvider>
              </SessionProvider>
            </MessagesProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
