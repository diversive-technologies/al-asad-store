import Link from 'next/link';

export interface SkipLinkProps {
  label: string;
  targetId: string;
}

/**
 * A11Y-02 — a keyboard user must be able to reach the main content without
 * tabbing through the whole header on every page.
 *
 * The link is visually hidden until focused rather than hidden with
 * `display: none`, which would remove it from the tab order and defeat it.
 */
export function SkipLink({ label, targetId }: SkipLinkProps) {
  return (
    <Link
      href={`#${targetId}`}
      className="focus:z-modal focus:rounded-card focus:bg-brand-600 focus:text-on-brand sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:px-4 focus:py-2"
    >
      {label}
    </Link>
  );
}
