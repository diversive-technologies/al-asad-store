import type { ReactNode } from 'react';

export interface FilterDisclosureProps {
  title: string;
  children: ReactNode;
}

/**
 * PD-01 — one collapsible filter group, shared by the facet groups, the price
 * range and the availability toggle.
 *
 * `<details>`/`<summary>` is a native disclosure: keyboard-operable, correctly
 * announced as expanded or collapsed, and needing neither ARIA of our own
 * (A11Y-11) nor a client boundary to open and close. Open by default, because a
 * filter a customer cannot see is a filter they will not use.
 */
export function FilterDisclosure({ title, children }: FilterDisclosureProps) {
  return (
    <details open className="border-border border-b pb-3">
      <summary className="text-fg marker:text-fg-muted cursor-pointer py-3 text-sm font-medium">
        {title}
      </summary>
      {children}
    </details>
  );
}
