import { NotFoundState } from '@/components/shared/NotFoundState';
import { ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { getMessages } from '@/i18n';

/**
 * An order address that cannot be an order number. It says only that, and never
 * whether some other order exists (§28.3's lookup keeps the same rule).
 */
export default async function OrderNotFound() {
  const messages = await getMessages();
  const t = messages.order;

  return (
    <NotFoundState heading={t.notFound} body={t.notFoundBody}>
      <ButtonLink href={ROUTES.catalogue.list} variant="primary">
        {t.continueShopping}
      </ButtonLink>
    </NotFoundState>
  );
}
