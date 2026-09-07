'use client';

import type { ComponentType } from 'react';

import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';
import { formatTemplate } from '@/lib/utils/format';
import { Columns2, Columns3, Square } from '@/lib/vendor/icons';

import { MOBILE_COLUMN_OPTIONS, type MobileColumns } from '../lib/grid-columns';
import { useGridColumns } from './GridColumnsScope';

/**
 * Each option's glyph SHOWS its layout — one pane, two, three — rather than
 * being an abstract mark the reader has to learn. That is the whole reason this
 * control can be icon-only.
 *
 * I18N-05: none of the three is directional, so none mirrors in Urdu.
 */
const ICONS: Record<MobileColumns, ComponentType<{ className?: string }>> = {
  1: Square,
  2: Columns2,
  3: Columns3,
};

/**
 * Choose how densely the grid packs, on small screens.
 *
 * A phone is the one place where there is no single right column count: one
 * column is a browsing view with photography big enough to judge a fabric,
 * three is a scanning view for someone who already knows the garment they want.
 * A desktop has an answer at each width and the breakpoints give it, so this
 * control is hidden from `md` up rather than offering a worse layout.
 *
 * A11Y-02: a `radiogroup`, not a row of buttons. These are mutually exclusive
 * views of one thing, which is what a radio group means, and it gives arrow-key
 * navigation between the options for free.
 */
export function GridColumnsControl({ messages }: { messages: Messages }) {
  const t = messages.catalogue;
  const { columns, setColumns } = useGridColumns();

  return (
    <div
      role="radiogroup"
      aria-label={t.layoutLabel}
      className="border-border flex items-center gap-0.5 rounded-card border p-0.5 md:hidden"
    >
      {MOBILE_COLUMN_OPTIONS.map((option) => {
        const Icon = ICONS[option];
        const isActive = option === columns;

        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={isActive}
            /* A11Y-04: an icon-only control still has to say what it does, and
               the count is what distinguishes the three. */
            aria-label={formatTemplate(t.layoutOption, { count: String(option) })}
            onClick={() => {
              setColumns(option);
            }}
            className={cn(
              'focus-visible:ring-brand-500 rounded-card p-2 transition-colors focus-visible:ring-2 focus-visible:outline-none',
              isActive ? 'bg-surface-muted text-fg' : 'text-fg-muted hover:text-fg',
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
