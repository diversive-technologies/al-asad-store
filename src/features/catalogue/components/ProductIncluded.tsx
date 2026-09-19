import type { Locale } from '@/i18n/locales';
import type { Messages } from '@/i18n/messages/en';
import { formatMetres } from '@/lib/utils/format';

import type { Piece } from '../schemas/product-detail.schema';

export interface ProductIncludedProps {
  pieces: readonly Piece[];
  locale: Locale;
  messages: Messages;
}

/** §28.2 "what is included": every piece, with its cloth, colour and length. */
export function ProductIncluded({ pieces, locale, messages }: ProductIncludedProps) {
  const t = messages.product;

  return (
    <section aria-labelledby="included-heading" className="mt-12">
      <h2 id="included-heading" className="text-fg mb-4 text-lg font-medium">
        {t.includedHeading}
      </h2>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pieces.map((piece) => (
          <li key={piece.id} className="rounded-card bg-surface-muted flex flex-col gap-1 p-4">
            <h3 className="text-fg text-sm font-medium">{piece.name}</h3>
            <p className="text-fg-muted text-sm">
              {piece.fabric.name}
              <span aria-hidden> · </span>
              {piece.colour.displayName}
            </p>
            <p className="text-fg-muted text-xs">{piece.colour.description}</p>
            {piece.lengthMetres === null ? null : (
              <p className="text-fg-muted text-xs">
                {t.lengthLabel}: <bdi>{formatMetres(piece.lengthMetres, locale)}</bdi>
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
