'use client';

import { Button } from '@/components/ui/button';
import { useMessages } from '@/i18n/use-messages';
import type { SizeId } from '@/lib/domain/ids';
import { formatTemplate } from '@/lib/utils/format';

import type { SavedSize } from '../schemas/saved-size.schema';

export interface SavedSizeRowProps {
  readonly entry: SavedSize;
  readonly isBusy: boolean;
  readonly onForget: (sizeId: SizeId) => void;
}

/**
 * One saved size: the chart it belongs to, the size, and a way to forget it.
 *
 * The button's visible word is the same on every row, so its NAME carries the
 * size and the chart (A11Y-04) — and starts with that word, so a voice user who
 * says what they see still reaches it. `aria-busy` rather than `disabled` while a
 * change is in flight: disabling the pressed control drops focus on the page, and
 * a second press is refused by the hook's own latch instead.
 */
export function SavedSizeRow({ entry, isBusy, onForget }: SavedSizeRowProps) {
  const t = useMessages().savedSizes;

  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="flex min-w-0 flex-col">
        {/* The chart's name as served, never rewritten (I18N-09). */}
        <span className="text-fg-muted text-sm">{entry.sizeSet.name}</span>
        {/* I18N-04 — a Latin size code inside an Urdu line keeps its own order. */}
        <bdi className="text-fg font-medium">{entry.size.label}</bdi>
      </div>

      {/* D6 — this records that the size was forgotten; the save stays on file. */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-busy={isBusy}
        aria-label={formatTemplate(t.forgetLabel, {
          size: entry.size.label,
          sizeSet: entry.sizeSet.name,
        })}
        onClick={() => {
          onForget(entry.size.id);
        }}
      >
        {t.forget}
      </Button>
    </li>
  );
}
