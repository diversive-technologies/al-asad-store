import type { ReactNode } from 'react';

import Link from 'next/link';

import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';

export interface FooterProps {
  messages: Messages;
  /** MOD-01: the newsletter is a feature, composed in by `app/layout.tsx`. */
  newsletter: ReactNode;
}

export function Footer({ messages, newsletter }: FooterProps) {
  const t = messages.footer;

  const helpLinks = [
    { key: 'fabric', href: ROUTES.help.fabricGlossary, label: t.fabricGlossary },
    { key: 'payment', href: ROUTES.help.paymentGuide, label: t.paymentGuide },
    { key: 'size', href: ROUTES.help.sizeGuide, label: t.sizeGuide },
    { key: 'care', href: ROUTES.help.careGuide, label: t.careGuide },
  ];

  const shopLinks = [
    { key: 'catalogue', href: ROUTES.catalogue.list, label: messages.nav.catalogue },
    {
      key: 'unstitched',
      href: ROUTES.catalogue.byGarmentType('unstitched'),
      label: messages.nav.unstitched,
    },
    {
      key: 'stitched',
      href: ROUTES.catalogue.byGarmentType('stitched'),
      label: messages.nav.stitched,
    },
  ];

  return (
    <footer className="border-border bg-surface-muted mt-12 border-t">
      <div className="px-gutter mx-auto grid max-w-6xl gap-8 py-10 md:grid-cols-3">
        <nav aria-label={messages.nav.footerLabel} className="flex flex-col gap-3">
          <h2 className="text-fg text-sm font-semibold">{t.shopHeading}</h2>
          <ul className="flex flex-col gap-2">
            {shopLinks.map((link) => (
              <li key={link.key}>
                <Link href={link.href} className="text-fg-muted hover:text-fg text-sm">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-3">
          <h2 className="text-fg text-sm font-semibold">{t.helpHeading}</h2>
          <ul className="flex flex-col gap-2">
            {helpLinks.map((link) => (
              <li key={link.key}>
                <Link href={link.href} className="text-fg-muted hover:text-fg text-sm">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {newsletter}
      </div>

      <div className="border-border border-t">
        <p className="px-gutter text-fg-muted mx-auto max-w-6xl py-4 text-xs">
          {messages.site.name} — {t.rightsReserved}
        </p>
      </div>
    </footer>
  );
}
