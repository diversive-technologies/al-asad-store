import Link from 'next/link';

import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';

export interface PrimaryNavProps {
  messages: Messages;
  className?: string;
}

/**
 * A11Y-01 — a real `<nav>` containing a real list of links.
 * SSOT-02 — every destination comes from the route registry.
 *
 * The garment-type entries point at filtered catalogue views rather than at
 * separate routes, because section 28.1 makes filter state URL-encoded and the
 * canonical page is the catalogue itself (section 30.5).
 */
export function PrimaryNav({ messages, className }: PrimaryNavProps) {
  const t = messages.nav;

  const links = [
    { key: 'catalogue', href: ROUTES.catalogue.list, label: t.catalogue },
    { key: 'unstitched', href: ROUTES.catalogue.byGarmentType('unstitched'), label: t.unstitched },
    { key: 'stitched', href: ROUTES.catalogue.byGarmentType('stitched'), label: t.stitched },
  ];

  return (
    <nav aria-label={t.primaryLabel} className={className}>
      <ul className="flex items-center gap-5">
        {links.map((link) => (
          <li key={link.key}>
            <Link href={link.href} className="text-fg hover:text-brand-600 text-sm">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
