import type { Metadata } from 'next';

import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { getMessages } from '@/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  return { title: messages.bag.title };
}

/**
 * The bag.
 *
 * This is NOT a placeholder pretending to be a feature: with no cart module yet
 * (M4), the bag genuinely is empty, and an empty-bag state is exactly what the
 * page should show. When Cart lands, the populated branch is added beside this
 * one — section 16's reservation logic replaces nothing here.
 */
export default async function BagPage() {
  const messages = await getMessages();
  const t = messages.bag;

  return (
    <section className="page-shell max-w-xl py-16">
      <h1 className="text-fg text-2xl font-semibold">{t.title}</h1>
      <p className="text-fg-muted mt-3">{t.emptyBody}</p>

      <div className="mt-6">
        <ButtonLink href={ROUTES.catalogue.list} variant="primary">
          {t.startShopping}
        </ButtonLink>
      </div>
    </section>
  );
}
