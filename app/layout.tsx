import type { ReactNode } from 'react';

import type { Metadata } from 'next';
import { Inter, Noto_Nastaliq_Urdu } from 'next/font/google';

import { SITE } from '@/config/site';
import { getLocale, getMessages } from '@/i18n';
import { DIRECTION } from '@/i18n/locales';
import { MessagesProvider } from '@/i18n/use-messages';
import { cn } from '@/lib/utils/cn';
import { QueryProvider } from '@/providers/query-provider';

import '@/styles/globals.css';

// NEXT-10 — fonts come from next/font; third-party <link> tags are PROHIBITED.
const latin = Inter({
  subsets: ['latin'],
  variable: '--font-latin',
  display: 'swap',
});

/**
 * I18N-11 — the stack covers both scripts. `preload: false` keeps the Nastaliq
 * files off the critical path for English visitors: architecture 30.1 requires
 * that this face is loaded only for Urdu.
 */
const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  weight: ['400', '600'],
  variable: '--font-nastaliq',
  display: 'swap',
  preload: false,
});

// NEXT-11 — metadata is exported, with shared defaults from SSOT-00.
export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: SITE.description,
};

export interface RootLayoutProps {
  children: ReactNode;
}

/**
 * I18N-03 — the ONLY place direction is decided. Components never read the
 * locale to flip themselves.
 */
export default async function RootLayout({ children }: RootLayoutProps) {
  // PERF-02: independent reads run in parallel, never as a waterfall.
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <html
      lang={locale}
      dir={DIRECTION[locale]}
      className={cn(latin.variable, nastaliq.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-dvh antialiased">
        <QueryProvider>
          <MessagesProvider value={messages}>{children}</MessagesProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
