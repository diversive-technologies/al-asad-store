import type { Messages } from '@/i18n/messages/en';

import type { InfoSection } from '../schemas/product-detail.schema';

export interface ProductInfoSectionsProps {
  sections: readonly InfoSection[];
  messages: Messages;
}

/** §28.2's information sections — how many is editorial, not structural. */
export function ProductInfoSections({ sections, messages }: ProductInfoSectionsProps) {
  if (sections.length === 0) return null;

  return (
    <section aria-labelledby="info-heading" className="mt-12">
      <h2 id="info-heading" className="sr-only">
        {messages.product.infoHeading}
      </h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {sections.map((info) => (
          <div key={info.id} className="flex flex-col gap-1">
            <h3 className="text-fg text-sm font-medium">{info.heading}</h3>
            <p className="text-fg-muted text-sm">{info.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
