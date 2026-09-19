import { NotFoundState } from '@/components/shared/NotFoundState';
import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { getMessages } from '@/i18n';

/**
 * A product address that names no product — a stale link, usually, followed from
 * a message or a search result. Said in the product's own words, with the way
 * back to the rest of the catalogue.
 */
export default async function ProductNotFound() {
  const messages = await getMessages();
  const t = messages.product;

  return (
    <NotFoundState heading={t.notFoundHeading} body={t.notFoundBody}>
      <ButtonLink href={ROUTES.catalogue.list} variant="primary">
        {t.backToCatalogue}
      </ButtonLink>
    </NotFoundState>
  );
}
