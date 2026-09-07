'use client';

import Image from 'next/image';

import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';
import { formatMoneyMinor } from '@/lib/utils/format';

import type { SuggestionOption } from '../lib/suggestions';

export interface SearchSuggestionsProps {
  options: readonly SuggestionOption[];
  activeIndex: number;
  listboxId: string;
  optionId: (index: number) => string;
  onSelect: (option: SuggestionOption) => void;
  locale: Locale;
  messages: Messages;
}

/** PERF-07: a 40px thumbnail should not download a product-card-sized image. */
const THUMBNAIL_SIZES = '40px';

/**
 * Section 28.1's type-ahead list: suggested terms, then product previews.
 *
 * The ARIA combobox pattern, which is why this is a `listbox` of `option`s and
 * NOT a list of links. Focus stays in the text field the whole time — the reader
 * is still typing — and the active row is announced through
 * `aria-activedescendant` on the input rather than by moving focus here. A row
 * that took focus would fight the field for the caret on every arrow press.
 *
 * `onMouseDown` rather than `onClick`, with the default prevented: mousedown
 * fires before the input's blur, so the selection is registered before anything
 * has a chance to dismiss the list underneath the pointer.
 */
export function SearchSuggestions({
  options,
  activeIndex,
  listboxId,
  optionId,
  onSelect,
  locale,
  messages,
}: SearchSuggestionsProps) {
  if (options.length === 0) return null;

  return (
    <ul
      id={listboxId}
      role="listbox"
      aria-label={messages.search.suggestionsLabel}
      className="rounded-card bg-surface shadow-popover absolute start-0 end-0 top-full z-10 mt-2 overflow-hidden py-1"
    >
      {options.map((option, index) => (
        <li
          key={option.id}
          id={optionId(index)}
          role="option"
          aria-selected={index === activeIndex}
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect(option);
          }}
          className={cn(
            'flex cursor-pointer items-center gap-3 px-3 py-2 text-sm',
            index === activeIndex ? 'bg-surface-muted' : null,
          )}
        >
          {option.product === null ? null : (
            <span className="rounded-card bg-surface-muted relative size-10 shrink-0 overflow-hidden">
              <Image
                // The first frame is the one a thumbnail should show.
                src={option.product.images[0] ?? ''}
                // A11Y-04: the row's own text names it; the thumbnail repeats it.
                alt=""
                aria-hidden
                fill
                sizes={THUMBNAIL_SIZES}
                className="object-cover"
              />
            </span>
          )}

          <span className="text-fg min-w-0 flex-1 truncate">{option.label}</span>

          {option.product === null ? null : (
            // I18N-08: money through the locale formatter, isolated for bidi.
            <bdi className="text-fg-muted shrink-0 text-xs">
              {formatMoneyMinor(option.product.pricing.currentMinor, locale)}
            </bdi>
          )}
        </li>
      ))}
    </ul>
  );
}
