import { OrderSkeleton } from '@/features/checkout/contract';
import { getMessages } from '@/i18n';

/** ERR-09: every fetching segment has a loading state — NEXT-14: in the page's own shape. */
export default async function OrderLoading() {
  const messages = await getMessages();
  return <OrderSkeleton label={messages.common.loading} />;
}
