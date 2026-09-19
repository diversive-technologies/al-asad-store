'use client';

import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Messages } from '@/i18n/messages/en';
import { useMessages } from '@/i18n/use-messages';
import { assertNever } from '@/lib/result';
import { Check, Link2 } from '@/lib/vendor/icons';

import { useCopyLink, type CopyOutcome } from '../hooks/use-copy-link';

export interface CopyLinkButtonProps {
  /** The product's canonical address, already absolute. */
  url: string;
}

function statusText(outcome: CopyOutcome, t: Messages['product']): string {
  switch (outcome.kind) {
    case 'COPIED':
      return t.linkCopied;
    case 'MANUAL':
      return t.copyLinkManual;
    case 'IDLE':
      return '';
    default:
      // TS-07: a new outcome without words is a compile error.
      return assertNever(outcome);
  }
}

/** Selects the field as it appears — which also focuses it — so the link is ready to copy. */
function selectOnMount(field: HTMLInputElement | null): void {
  field?.select();
}

/**
 * §28.2's copy-link sharing — the one interactive part of the share row, and so
 * the one client leaf in it (MOD-06).
 *
 * It never fails silently. The result is written into a live region that exists
 * before any words do (§30.3), so "Link copied." is announced; and a press the
 * browser refuses SHOWS the link in a read-only field, selected and focused, with
 * a sentence saying why — the customer still leaves with the link.
 *
 * It renders as siblings rather than inside a wrapper, so the button sits in the
 * share row beside WhatsApp, the confirmation beside it, and the fallback field
 * takes a whole row of its own below (`basis-full`).
 */
export function CopyLinkButton({ url }: CopyLinkButtonProps) {
  const t = useMessages().product;
  const { outcome, copy } = useCopyLink(url);
  const fieldId = useId();

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={copy}>
        {/* A11Y-04: decorative beside a real label. I18N-05: neither glyph points. */}
        {outcome.kind === 'COPIED' ? (
          <Check className="me-2 size-4" aria-hidden />
        ) : (
          <Link2 className="me-2 size-4" aria-hidden />
        )}
        {t.copyLink}
      </Button>

      <p role="status" className="text-fg-muted text-xs">
        {/* Re-keyed per press, so a second "Link copied." is a new announcement. */}
        <span key={outcome.attempt}>{statusText(outcome, t)}</span>
      </p>

      {outcome.kind === 'MANUAL' ? (
        <div className="flex basis-full flex-col gap-1">
          <label htmlFor={fieldId} className="text-fg text-sm font-medium">
            {t.productLinkLabel}
          </label>
          {/* `dir="auto"`: an address reads left to right because its CONTENT does,
              whichever language the page around it is in. */}
          <Input
            ref={selectOnMount}
            id={fieldId}
            type="url"
            readOnly
            dir="auto"
            value={url}
            onFocus={(event) => {
              event.currentTarget.select();
            }}
          />
        </div>
      ) : null}
    </>
  );
}
