import { buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { absoluteUrl } from '@/config/site';
import type { Messages } from '@/i18n/messages/en';
import { formatTemplate } from '@/lib/utils/format';
import { MessageCircle } from '@/lib/vendor/icons';

import { whatsAppShareUrl } from '../lib/share-links';
import { CopyLinkButton } from './CopyLinkButton';

export interface ProductShareProps {
  slug: string;
  /** As served — a protected term in it is passed on untouched (I18N-09). */
  productName: string;
  messages: Messages;
}

/**
 * §28.2's "WhatsApp and copy-link sharing".
 *
 * Both share the product's CANONICAL address — the one `generateMetadata` names
 * (§30.5) — built from `ROUTES` and the validated app URL, so a link sent from a
 * filtered listing, a search or a campaign lands on the same page every other
 * link to this product does. It carries no locale: the recipient reads the store
 * in their own.
 *
 * WhatsApp is an ordinary link out, not a script: its click-to-chat address opens
 * with the message already written, and the customer picks who receives it. It is
 * server-rendered, so it works before the page hydrates. `noopener noreferrer`
 * (SEC-09) keeps the product page out of reach of whatever opens, and the link
 * says in words that it opens elsewhere.
 *
 * Copying needs the browser, so it is the single client leaf (MOD-06).
 */
export function ProductShare({ slug, productName, messages }: ProductShareProps) {
  const t = messages.product;
  const productUrl = absoluteUrl(ROUTES.catalogue.detail(slug));

  // I18N-06: one parameterised message, so a language can put the link where it reads best.
  const message = formatTemplate(t.shareMessage, {
    name: productName,
    store: messages.site.name,
    url: productUrl,
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={whatsAppShareUrl(message)}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: 'secondary', size: 'sm' })}
      >
        {/* A11Y-04: decorative beside a real label. I18N-05: a speech bubble does
            not point, so it does not mirror. */}
        <MessageCircle className="me-2 size-4" aria-hidden />
        {t.shareOnWhatsApp}
        <span className="sr-only"> {messages.common.opensInNewTab}</span>
      </a>

      <CopyLinkButton url={productUrl} />
    </div>
  );
}
