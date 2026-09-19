'use client';

import Image from 'next/image';
import Link from 'next/link';

import { ROUTES } from '@/config/routes';
import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatMoneyMinor } from '@/lib/utils/format';

import type { BagLineActions } from '../hooks/use-bag-line-changes';
import type { BagLine } from '../schemas/bag.schema';
import { BagLineControls } from './BagLineControls';
import { StitchedLineDetail } from './StitchedLineDetail';

export interface BagLineRowProps {
  line: BagLine;
  locale: Locale;
  messages: Messages;
  isBusy: boolean;
  actions: BagLineActions;
}

const THUMB_SIZES = '5rem';

/**
 * One line of the bag: §28.2's "per-piece size display, quantity, remove".
 *
 * The per-piece display is not decoration. A three-piece set was sized three
 * times on the product page, and the bag is the last place a customer can catch
 * that they put the shalwar in the wrong size — so all three are listed, from
 * labels the backend authored (I18N-06).
 */
export function BagLineRow({ line, locale, messages, isBusy, actions }: BagLineRowProps) {
  return (
    <li className="border-border flex gap-3 border-b py-4 last:border-b-0">
      <Link
        href={ROUTES.catalogue.detail(line.slug)}
        className="rounded-card bg-surface-muted focus-visible:ring-brand-500 relative size-20 shrink-0 overflow-hidden focus-visible:ring-2 focus-visible:outline-none"
      >
        <Image
          src={line.imageUrl}
          alt={line.name}
          fill
          sizes={THUMB_SIZES}
          className="object-cover"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={ROUTES.catalogue.detail(line.slug)}
            className="text-fg text-sm hover:underline"
          >
            {line.name}
          </Link>
          <span className="text-fg shrink-0 text-sm">
            {formatMoneyMinor(line.lineTotalMinor, locale)}
          </span>
        </div>

        {/* §28.2 per-piece size display. A SIMPLE product has one row here and
            that is correct, not a degenerate case worth branching on. A garment
            being CUT has none: it has no size, which is the point of it. */}
        <ul className="text-fg-muted mt-1 space-y-0.5 text-xs">
          {line.pieces.map((piece) => (
            <li key={piece.pieceId}>
              {piece.name} · {piece.sizeLabel}
            </li>
          ))}
        </ul>

        {line.stitching === null ? null : (
          <StitchedLineDetail
            stitching={line.stitching}
            unitPriceMinor={line.unitPriceMinor}
            locale={locale}
            messages={messages}
          />
        )}

        <BagLineControls
          line={line}
          locale={locale}
          messages={messages}
          isBusy={isBusy}
          actions={actions}
        />
      </div>
    </li>
  );
}
