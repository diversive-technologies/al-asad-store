import Link from 'next/link';

/** One footer link. `key` is the link's stable identity (CMP-10). */
export interface FooterLink {
  readonly key: string;
  readonly href: string;
  readonly label: string;
}

export interface FooterLinkGroupProps {
  heading: string;
  links: readonly FooterLink[];
}

/**
 * A footer column's heading and its list of links. The wrapper — a `nav` for the
 * shop, a plain column for help — stays with `Footer`, which decides what each
 * column IS; this only draws what is in it (PD-01: the two lists were identical).
 */
export function FooterLinkGroup({ heading, links }: FooterLinkGroupProps) {
  return (
    <>
      <h2 className="text-fg text-sm font-semibold">{heading}</h2>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.key}>
            <Link href={link.href} className="text-fg-muted hover:text-fg text-sm">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
