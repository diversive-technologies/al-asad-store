import type { ReactNode } from 'react';

import { ROUTES, STORE_PAGE_SLUGS } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';

import { FooterLinkGroup, type FooterLink } from './FooterLinkGroup';

export interface FooterProps {
  messages: Messages;
  /** MOD-01: the newsletter is a feature, composed in by `app/layout.tsx`. */
  newsletter: ReactNode;
  /**
   * The way back to the default language for a visitor who arrived reading
   * another while the header offers no switch, or nothing (`localeSwitchPlace`).
   */
  localeSwitcher: ReactNode;
}

/**
 * The foot of every page: the shop, the help a customer looks for before and
 * after buying — delivery and returns first — and the store's own pages, with
 * the terms it sells on.
 *
 * One column on a phone, as it always was. From `md` the three link groups sit
 * side by side and the newsletter takes the row below; from `lg` all four share
 * one row, the newsletter given two of five tracks because its field and button
 * need the width that a list of links does not.
 */
export function Footer({ messages, newsletter, localeSwitcher }: FooterProps) {
  const t = messages.footer;

  const shopLinks: FooterLink[] = [
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

  const helpLinks: FooterLink[] = [
    { key: 'delivery', href: ROUTES.help.page(STORE_PAGE_SLUGS.delivery), label: t.delivery },
    { key: 'returns', href: ROUTES.help.page(STORE_PAGE_SLUGS.returns), label: t.returns },
    { key: 'size', href: ROUTES.help.sizeGuide, label: t.sizeGuide },
    { key: 'payment', href: ROUTES.help.paymentGuide, label: t.paymentGuide },
    { key: 'fabric', href: ROUTES.help.fabricGlossary, label: t.fabricGlossary },
    { key: 'care', href: ROUTES.help.careGuide, label: t.careGuide },
  ];

  const storeLinks: FooterLink[] = [
    { key: 'about', href: ROUTES.help.page(STORE_PAGE_SLUGS.about), label: t.aboutUs },
    { key: 'contact', href: ROUTES.help.page(STORE_PAGE_SLUGS.contact), label: t.contactUs },
    { key: 'terms', href: ROUTES.help.page(STORE_PAGE_SLUGS.terms), label: t.termsOfSale },
    { key: 'privacy', href: ROUTES.help.page(STORE_PAGE_SLUGS.privacy), label: t.privacy },
  ];

  return (
    <footer className="border-border bg-surface-muted mt-12 border-t">
      <div className="page-shell grid grid-cols-1 gap-8 py-10 md:grid-cols-3 lg:grid-cols-5">
        <nav aria-label={messages.nav.footerLabel} className="flex flex-col gap-3">
          <FooterLinkGroup heading={t.shopHeading} links={shopLinks} />
        </nav>

        <div className="flex flex-col gap-3">
          <FooterLinkGroup heading={t.helpHeading} links={helpLinks} />
        </div>

        <div className="flex flex-col gap-3">
          <FooterLinkGroup heading={t.storeHeading} links={storeLinks} />
        </div>

        {newsletter === null ? null : (
          <div className="md:col-span-3 lg:col-span-2">{newsletter}</div>
        )}
      </div>

      <div className="border-border border-t">
        <div className="page-shell flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4">
          <p className="text-fg-muted text-xs">
            {messages.site.name} — {t.rightsReserved}
          </p>
          {localeSwitcher}
        </div>
      </div>
    </footer>
  );
}
