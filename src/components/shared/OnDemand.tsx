'use client';

import type { ReactNode } from 'react';

import { useOnDemand, type OnDemandPart } from '@/hooks/use-on-demand';

import { OnDemandFailure } from './OnDemandFailure';

export interface OnDemandProps<T> {
  /** The part, declared once at module scope with `onDemandPart` (IMP-01a). */
  readonly part: OnDemandPart<T>;
  /** Draws it, once it has arrived. */
  readonly children: (arrived: T) => ReactNode;
  /** What stands in while it downloads — nothing, unless a customer can see the wait. */
  readonly loading?: ReactNode;
  /**
   * What a failed download shows instead: by default the notice with Try again.
   * A surface passes the notice with another way on, or nothing where another
   * part of the same surface already says it.
   */
  readonly failure?: (retry: () => void) => ReactNode;
}

function tryAgain(retry: () => void): ReactNode {
  return <OnDemandFailure onRetry={retry} />;
}

/**
 * A part of the page downloaded when it is drawn, with a failure that stays in
 * its place (`useOnDemand` has the reasoning). It replaces `next/dynamic` for a
 * part never drawn on the server; one that is keeps `next/dynamic`, whose
 * loader answers a stand-in when the download fails.
 */
export function OnDemand<T>({
  part,
  children,
  loading = null,
  failure = tryAgain,
}: OnDemandProps<T>) {
  const { state, retry } = useOnDemand(part);

  if (state.status === 'READY') return children(state.value);
  if (state.status === 'FAILED') return failure(retry);
  return loading;
}
