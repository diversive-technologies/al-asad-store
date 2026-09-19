import { NotFoundState } from '@/components/shared/NotFoundState';
import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { getMessages } from '@/i18n';

/**
 * The store's 404, for an address nothing matches and for any `notFound()` below
 * a segment without one of its own (a help page with no content, for one).
 * SSOT-07: the copy is the reader's language, not the framework's English.
 */
export default async function NotFound() {
  const messages = await getMessages();
  const t = messages.notFound;

  return (
    <NotFoundState heading={t.heading} body={t.body}>
      <ButtonLink href={ROUTES.home} variant="primary">
        {t.homeCta}
      </ButtonLink>
      <ButtonLink href={ROUTES.catalogue.list} variant="secondary">
        {t.catalogueCta}
      </ButtonLink>
    </NotFoundState>
  );
}
