import type { ReactNode } from 'react';

export interface FilterDisclosureProps {
  title: string;
  children: ReactNode;
}

/**
 * PD-01 — one collapsible filter group, shared by the facet groups, the price
 * range and the availability toggle.
 *
 * No separator rule between groups: the spacing carries the grouping instead,
 * which keeps the rail free of the hairlines the operator asked to remove.
 *
 * `<details>`/`<summary>` is a native disclosure: keyboard-operable, correctly
 * announced as expanded or collapsed, and needing neither ARIA of our own
 * (A11Y-11) nor a client boundary to open and close. Open by default, because a
 * filter a customer cannot see is a filter they will not use.
 */
export function FilterDisclosure({ title, children }: FilterDisclosureProps) {
  return (
    <details open className="pb-4">
      <summary className="text-fg marker:text-fg-muted cursor-pointer py-3 text-sm font-medium">
        {title}
      </summary>
      {children}
    </details>
  );
}
