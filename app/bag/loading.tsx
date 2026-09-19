import { BagPageSkeleton } from '@/features/bag/contract';

/** ERR-09 — every fetching segment has its own loading state (NEXT-14: in its own shape). */
export default function Loading() {
  return <BagPageSkeleton />;
}
