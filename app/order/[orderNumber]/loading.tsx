import { getMessages } from '@/i18n';

/** ERR-09: every fetching segment has a loading state. This one had neither. */
export default async function OrderLoading() {
  const messages = await getMessages();
  return <p className="page-shell text-fg-muted py-16">{messages.common.loading}</p>;
}
