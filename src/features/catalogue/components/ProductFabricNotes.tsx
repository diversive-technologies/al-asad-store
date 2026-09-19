import type { Messages } from '@/i18n/messages/en';

import type { Fabric, Piece } from '../schemas/product-detail.schema';

export interface ProductFabricNotesProps {
  pieces: readonly Piece[];
  messages: Messages;
}

/**
 * §6.3 — care text is held against the FABRIC, so a product with pieces in two
 * fabrics has two care notes. De-duplicated by fabric id, not by text.
 */
export function ProductFabricNotes({ pieces, messages }: ProductFabricNotesProps) {
  const t = messages.product;
  const fabrics: Fabric[] = [
    ...new Map(pieces.map((piece) => [piece.fabric.id, piece.fabric])).values(),
  ];

  return (
    <section aria-labelledby="fabric-heading" className="mt-12">
      <h2 id="fabric-heading" className="text-fg mb-4 text-lg font-medium">
        {t.fabricLabel}
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fabrics.map((fabric) => (
          <div key={fabric.id} className="flex flex-col gap-1">
            <h3 className="text-fg text-sm font-medium">{fabric.name}</h3>
            <p className="text-fg-muted text-sm">{fabric.explainer}</p>
            <p className="text-fg-muted text-sm">
              <span className="text-fg">{t.careLabel}: </span>
              {fabric.careText}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
