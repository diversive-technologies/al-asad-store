import { ListingSkeleton } from '@/features/catalogue';

/** ERR-09 — every fetching segment has its own loading state. */
export default function Loading() {
  return <ListingSkeleton />;
}
