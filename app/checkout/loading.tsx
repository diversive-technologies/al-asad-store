import { getMessages } from '@/i18n';

/** ERR-09: every fetching segment has a loading state. */
export default async function CheckoutLoading() {
  const messages = await getMessages();
  return <p className="page-shell text-fg-muted py-16">{messages.common.loading}</p>;
}
