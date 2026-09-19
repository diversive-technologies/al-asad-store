'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * A part of the page whose code is downloaded when it is first wanted (IMP-01a,
 * PERF-10), declared once at module scope beside the component that draws it.
 *
 * Why not `next/dynamic` alone: its lazy component THROWS when the download
 * fails — a dropped request on a phone, or a chunk gone after a deploy — and
 * the throw reaches the nearest error boundary. For the bag panel and the search
 * panel that is the root's, which swaps the whole store for the bare error page;
 * for the studio it is the route's, which takes every figure typed with it. And
 * the rejection is kept, so every later attempt fails the same way until a
 * reload. Here a failed download is a VALUE (DATA-03) and is not kept: the host
 * stays mounted, says so, and asking again downloads again.
 */
export interface OnDemandPart<T> {
  /**
   * Downloads it — or answers at once with what has already arrived. `null` when
   * it could not be downloaded; never rejects. One download is shared by every
   * caller while it is in flight.
   */
  readonly get: () => Promise<T | null>;
  /** Starts the download without waiting for it: a pointer over the control that opens it. */
  readonly warm: () => void;
  /** What has arrived, if anything has — `useSyncExternalStore`'s snapshot. */
  readonly arrived: () => T | undefined;
  /** Hears the moment it arrives, so every surface drawing it is told at once. */
  readonly subscribe: (onArrival: () => void) => () => void;
}

export function onDemandPart<T>(load: () => Promise<T>): OnDemandPart<T> {
  let arrived: T | undefined;
  let pending: Promise<T | null> | null = null;
  const listeners = new Set<() => void>();

  function get(): Promise<T | null> {
    if (arrived !== undefined) return Promise.resolve(arrived);
    // DATA-03: a download that fails is a value, never a rejection.
    pending ??= load().then<T | null, null>(
      (value) => {
        arrived = value;
        pending = null;
        listeners.forEach((listener) => {
          listener();
        });
        return value;
      },
      () => {
        // Not kept: the next ask is a fresh download, not the refused one.
        pending = null;
        return null;
      },
    );
    return pending;
  }

  return {
    get,
    warm: () => {
      void get();
    },
    arrived: () => arrived,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Where a part is: not asked for yet, on its way, here, or refused by the network. */
export type OnDemandState<T> =
  | { readonly status: 'IDLE' }
  | { readonly status: 'LOADING' }
  | { readonly status: 'READY'; readonly value: T }
  | { readonly status: 'FAILED' };

export interface UseOnDemandResult<T> {
  readonly state: OnDemandState<T>;
  /** Asks again after a failure: a fresh download, drawn when it arrives. */
  readonly retry: () => void;
}

/* Nothing has arrived on the server, so a hydrating page draws what the server did. */
function nothingYet(): undefined {
  return undefined;
}

/**
 * The part, downloaded once `isWanted` — which a surface drawn only when it is
 * wanted leaves at its default.
 */
export function useOnDemand<T>(part: OnDemandPart<T>, isWanted = true): UseOnDemandResult<T> {
  const arrived = useSyncExternalStore(part.subscribe, part.arrived, nothingYet);
  const [hasFailed, setHasFailed] = useState(false);
  const state = onDemandState(arrived, hasFailed, isWanted);
  const isLoading = state.status === 'LOADING';

  useEffect(() => {
    if (!isLoading) return;
    let isCurrent = true;
    // An arrival reaches every surface through `subscribe`; only a failure is this one's to hold.
    void part.get().then((value) => {
      if (isCurrent && value === null) setHasFailed(true);
    });
    return () => {
      isCurrent = false;
    };
  }, [part, isLoading]);

  return {
    state,
    retry: () => {
      setHasFailed(false);
    },
  };
}

/**
 * Where a part is, for one surface: what has arrived wins over a failure this
 * surface saw, because another surface may have asked again since.
 */
export function onDemandState<T>(
  arrived: T | undefined,
  hasFailed: boolean,
  isWanted: boolean,
): OnDemandState<T> {
  if (arrived !== undefined) return { status: 'READY', value: arrived };
  if (hasFailed) return { status: 'FAILED' };
  return isWanted ? { status: 'LOADING' } : { status: 'IDLE' };
}
